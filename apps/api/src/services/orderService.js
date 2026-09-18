import { PAID_ORDER_STATUSES } from '@lexbridge/shared';
import { BRAND, isFeatureEnabled } from '../brand/index.js';
import { IS_RAZORPAY_CHECKOUT_CONFIGURED, RAZORPAY_KEY_ID } from '../config/index.js';
import { logger } from '../logger.js';
import {
  ORDER_REFUND_LIMIT,
  OrderModel,
  ProductModel,
  STATUS_HISTORY_LIMIT,
  ServiceRequestModel,
} from '../models/index.js';
import { createHttpError, createWithUniqueReference, formatRupees } from '../utils.js';
import { notifyOrderPaid, notifyOrderRefunded } from './commerceNotifications.js';
import { evaluateCoupon, redeemCoupon } from './couponService.js';
import { createRazorpayOrder, createRazorpayRefund, isValidCheckoutSignature } from './razorpayService.js';

// Razorpay's minimum charge is ₹1
const MIN_ONLINE_PAYMENT_PAISE = 100;
const PAYMENTS_NOT_SET_UP_MESSAGE = 'Online payments are not set up yet. Please contact us to complete this order.';

const CLIENT_ORDER_KEYS = [
  '_id',
  'ReferenceCode',
  'Items',
  'SubtotalPaise',
  'DiscountPaise',
  'TotalPaise',
  'CouponCode',
  'Status',
  'StatusHistory',
  'RefundedPaise',
  'ServiceRequestReference',
  'PreferredLanguage',
  'paidAt',
  'createdAt',
  'updatedAt',
];

export const CLIENT_ORDER_FIELDS = CLIENT_ORDER_KEYS.join(' ');

export function extractClientOrder(order) {
  return Object.fromEntries(CLIENT_ORDER_KEYS.map((key) => [key, order[key]]));
}

function createHistoryPush(status, note = '') {
  return { StatusHistory: { $each: [{ Status: status, Note: note, changedAt: new Date() }], $slice: -STATUS_HISTORY_LIMIT } };
}

// Prices always come from the database; anything the client sends about amounts is ignored
async function priceOrderItems(slugs) {
  const uniqueSlugs = [...new Set(slugs)];
  const products = await ProductModel.find({ Slug: { $in: uniqueSlugs }, IsPublished: true })
    .select('Slug Title Category ServiceCategory PricePaise')
    .lean();
  if (products.length !== uniqueSlugs.length) {
    throw createHttpError(400, 'One or more selected services are no longer available.');
  }
  const productsBySlug = new Map(products.map((product) => [product.Slug, product]));
  return uniqueSlugs.map((slug) => {
    const product = productsBySlug.get(slug);
    return {
      Product: product._id,
      Slug: product.Slug,
      TitleSnapshot: product.Title,
      Category: product.Category,
      ServiceCategory: product.ServiceCategory,
      PricePaise: product.PricePaise,
    };
  });
}

export async function quoteOrder({ slugs, couponCode, email }) {
  const items = await priceOrderItems(slugs);
  const subtotalPaise = items.reduce((total, item) => total + item.PricePaise, 0);
  let coupon = null;
  let discountPaise = 0;
  if (couponCode) {
    if (!isFeatureEnabled('coupons')) throw createHttpError(400, 'Coupon codes are not available right now.');
    ({ coupon, discountPaise } = await evaluateCoupon({ code: couponCode, items, email }));
  }
  return { items, subtotalPaise, discountPaise, totalPaise: subtotalPaise - discountPaise, coupon };
}

export async function createCheckoutOrder({ input, user }) {
  const email = input.Email.toLowerCase();
  const quote = await quoteOrder({ slugs: input.Items.map((item) => item.Slug), couponCode: input.CouponCode, email });

  if (quote.totalPaise > 0 && !IS_RAZORPAY_CHECKOUT_CONFIGURED) throw createHttpError(503, PAYMENTS_NOT_SET_UP_MESSAGE);
  if (quote.totalPaise > 0 && quote.totalPaise < MIN_ONLINE_PAYMENT_PAISE) {
    throw createHttpError(400, `The order total after discount must be at least ${formatRupees(MIN_ONLINE_PAYMENT_PAISE)}.`);
  }

  const now = new Date();
  const order = await createWithUniqueReference('LO', (referenceCode) => OrderModel.create({
    ReferenceCode: referenceCode,
    Client: user?.id ?? null,
    FullName: input.FullName,
    Email: email,
    Phone: input.Phone,
    Description: input.Description,
    PreferredLanguage: input.PreferredLanguage,
    WhatsAppOptIn: input.WhatsAppOptIn,
    Items: quote.items,
    SubtotalPaise: quote.subtotalPaise,
    DiscountPaise: quote.discountPaise,
    TotalPaise: quote.totalPaise,
    CouponCode: quote.coupon?.Code ?? '',
    Coupon: quote.coupon?._id ?? null,
    Status: 'created',
    StatusHistory: [{ Status: 'created', changedAt: now }],
    ConsentGiven: true,
    consentedAt: now,
  }));

  // Fully discounted orders need no payment
  if (quote.totalPaise === 0) {
    return { order: await markOrderPaid(order._id, { note: 'Covered in full by a coupon' }), checkout: null };
  }

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountPaise: order.TotalPaise,
      receipt: order.ReferenceCode,
      notes: { orderReference: order.ReferenceCode },
    });
  } catch (err) {
    await OrderModel.updateOne(
      { _id: order._id },
      { $set: { Status: 'cancelled' }, $push: createHistoryPush('cancelled', 'Payment could not be started') },
    );
    logger.error({ err, orderReference: order.ReferenceCode }, '[orders] Razorpay order creation failed');
    throw createHttpError(502, 'We could not start the payment. Please try again.');
  }

  const savedOrder = await OrderModel.findOneAndUpdate(
    { _id: order._id },
    { $set: { RazorpayOrderId: razorpayOrder.id } },
    { returnDocument: 'after' },
  ).lean();

  return {
    order: savedOrder,
    checkout: {
      keyId: RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: savedOrder.TotalPaise,
      currency: 'INR',
      name: BRAND.name,
      description: savedOrder.Items.map((item) => item.TitleSnapshot).join(', ').slice(0, 250),
      prefill: { name: savedOrder.FullName, email: savedOrder.Email, contact: savedOrder.Phone },
      notes: { orderReference: savedOrder.ReferenceCode },
    },
  };
}

/*
  Marks an order paid and fulfils it. Safe to call repeatedly and concurrently (checkout verification
  and the webhook usually both arrive): the status change and fulfilment each succeed only once.
*/
export async function markOrderPaid(orderId, { paymentId = '', note = '' } = {}) {
  const setFields = { Status: 'paid', paidAt: new Date() };
  if (paymentId) setFields.RazorpayPaymentId = paymentId;

  const order = await OrderModel.findOneAndUpdate(
    { _id: orderId, Status: { $in: ['created', 'failed'] } },
    { $set: setFields, $push: createHistoryPush('paid', note) },
    { returnDocument: 'after' },
  ).lean() ?? await OrderModel.findById(orderId).lean();

  if (!order || !PAID_ORDER_STATUSES.includes(order.Status)) return order;
  return fulfillPaidOrder(order);
}

function deriveRequestDescription(order) {
  const titles = order.Items.map((item) => item.TitleSnapshot).join(', ');
  const details = order.Description ? `\n\nClient's details:\n${order.Description}` : '';
  return `Paid order ${order.ReferenceCode} (${formatRupees(order.TotalPaise)}): ${titles}.${details}`.slice(0, 5000);
}

async function fulfillPaidOrder(order) {
  if (order.ServiceRequest) return order;

  const claimedOrder = await OrderModel.findOneAndUpdate(
    { _id: order._id, fulfillmentStartedAt: null },
    { $set: { fulfillmentStartedAt: new Date() } },
    { returnDocument: 'after' },
  ).lean();
  // Another request is already fulfilling this order
  if (!claimedOrder) return OrderModel.findById(order._id).lean();

  if (claimedOrder.Coupon && !(await redeemCoupon(claimedOrder.Coupon))) {
    logger.warn({ orderReference: claimedOrder.ReferenceCode }, '[orders] coupon limit reached before payment; order honoured');
  }

  const now = new Date();
  const request = await createWithUniqueReference('LB', (referenceCode) => ServiceRequestModel.create({
    ReferenceCode: referenceCode,
    Client: claimedOrder.Client,
    FullName: claimedOrder.FullName,
    Email: claimedOrder.Email,
    Phone: claimedOrder.Phone,
    ServiceCategory: claimedOrder.Items[0].ServiceCategory,
    Subtype: claimedOrder.Items.map((item) => item.TitleSnapshot).join(', ').slice(0, 120),
    Description: deriveRequestDescription(claimedOrder),
    Source: 'catalog-order',
    StatusHistory: [{ Status: 'submitted', changedAt: now }],
    PreferredLanguage: claimedOrder.PreferredLanguage,
    WhatsAppOptIn: claimedOrder.WhatsAppOptIn,
    ConsentGiven: true,
    consentedAt: claimedOrder.consentedAt,
  }));

  const fulfilledOrder = await OrderModel.findOneAndUpdate(
    { _id: claimedOrder._id },
    { $set: { ServiceRequest: request._id, ServiceRequestReference: request.ReferenceCode } },
    { returnDocument: 'after' },
  ).lean();
  await notifyOrderPaid(fulfilledOrder);
  logger.info({ orderReference: fulfilledOrder.ReferenceCode, requestReference: request.ReferenceCode }, '[orders] order paid and fulfilled');
  return fulfilledOrder;
}

export async function verifyCheckoutPayment({ razorpayOrderId, paymentId, signature }) {
  if (!IS_RAZORPAY_CHECKOUT_CONFIGURED) throw createHttpError(503, PAYMENTS_NOT_SET_UP_MESSAGE);
  if (!isValidCheckoutSignature({ orderId: razorpayOrderId, paymentId, signature })) {
    throw createHttpError(400, "We couldn't confirm this payment. If money was deducted, your order will update automatically or the amount will be refunded.");
  }
  const order = await OrderModel.findOne({ RazorpayOrderId: razorpayOrderId }).select('_id').lean();
  if (!order) throw createHttpError(404, 'Order not found');
  return markOrderPaid(order._id, { paymentId });
}

// Applies a verified Razorpay payment, order or refund webhook event. Returns a short outcome string.
export async function applyOrderWebhookEvent(event) {
  const eventName = event?.event;

  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id;
    if (typeof razorpayOrderId !== 'string') return 'ignored';

    const order = await OrderModel.findOne({ RazorpayOrderId: razorpayOrderId }).select('_id TotalPaise Status ReferenceCode').lean();
    if (!order) return 'unknown-order';

    const amountPaid = Number(payment?.amount ?? event.payload?.order?.entity?.amount_paid ?? 0);
    if (amountPaid < order.TotalPaise) {
      logger.error({ orderReference: order.ReferenceCode, amountPaid, expected: order.TotalPaise }, '[orders] payment lower than order total; not marked paid');
      return 'amount-mismatch';
    }

    const wasPaid = PAID_ORDER_STATUSES.includes(order.Status);
    await markOrderPaid(order._id, { paymentId: typeof payment?.id === 'string' ? payment.id : '' });
    return wasPaid ? 'already-paid' : 'order-paid';
  }

  if (eventName === 'payment.failed') {
    const razorpayOrderId = event.payload?.payment?.entity?.order_id;
    if (typeof razorpayOrderId !== 'string') return 'ignored';
    const result = await OrderModel.updateOne(
      { RazorpayOrderId: razorpayOrderId, Status: 'created' },
      { $set: { Status: 'failed' }, $push: createHistoryPush('failed', 'Payment attempt failed') },
    );
    return result.modifiedCount > 0 ? 'order-failed' : 'ignored';
  }

  if (eventName === 'refund.processed' || eventName === 'refund.failed') {
    const refund = event.payload?.refund?.entity;
    if (typeof refund?.id !== 'string') return 'ignored';
    const refundStatus = eventName === 'refund.processed' ? 'processed' : 'failed';
    const result = await OrderModel.updateOne(
      { 'Refunds.RazorpayRefundId': refund.id },
      { $set: { 'Refunds.$.Status': refundStatus } },
    );
    return result.matchedCount > 0 ? 'refund-updated' : 'unknown-refund';
  }

  return 'ignored';
}

export async function refundOrder({ referenceCode, amountPaise, reason, adminId }) {
  const order = await OrderModel.findOne({ ReferenceCode: referenceCode }).lean();
  if (!order) throw createHttpError(404, 'Order not found');
  if (!['paid', 'partially-refunded'].includes(order.Status)) throw createHttpError(400, 'Only paid orders can be refunded.');
  if (!order.RazorpayPaymentId) throw createHttpError(400, 'This order has no online payment to refund.');
  if (order.Refunds.length >= ORDER_REFUND_LIMIT) throw createHttpError(400, 'This order has reached the refund limit.');

  const refundablePaise = order.TotalPaise - order.RefundedPaise;
  const requestedPaise = amountPaise ?? refundablePaise;
  if (requestedPaise < 1 || requestedPaise > refundablePaise) {
    throw createHttpError(400, `Enter a refund between ₹0.01 and ${formatRupees(refundablePaise)}.`);
  }
  if (!IS_RAZORPAY_CHECKOUT_CONFIGURED) throw createHttpError(503, PAYMENTS_NOT_SET_UP_MESSAGE);

  let refund;
  try {
    refund = await createRazorpayRefund({
      paymentId: order.RazorpayPaymentId,
      amountPaise: requestedPaise,
      notes: { orderReference: order.ReferenceCode, reason: reason.slice(0, 200) },
      receipt: `${order.ReferenceCode}-R${order.Refunds.length + 1}`,
    });
  } catch (err) {
    logger.error({ err, orderReference: order.ReferenceCode }, '[orders] Razorpay refund failed');
    throw createHttpError(502, err.razorpayDescription ? `Razorpay refused the refund: ${err.razorpayDescription}` : 'The refund could not be started. Please try again.');
  }

  const refundedOrder = await OrderModel.findOneAndUpdate(
    { _id: order._id },
    {
      $inc: { RefundedPaise: refund.amountPaise },
      $push: {
        Refunds: {
          RazorpayRefundId: refund.id,
          AmountPaise: refund.amountPaise,
          Status: refund.status,
          Reason: reason,
          CreatedBy: adminId,
          createdAt: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  ).lean();

  const status = refundedOrder.RefundedPaise >= refundedOrder.TotalPaise ? 'refunded' : 'partially-refunded';
  const updatedOrder = await OrderModel.findOneAndUpdate(
    { _id: order._id },
    { $set: { Status: status }, $push: createHistoryPush(status, `Refund of ${formatRupees(refund.amountPaise)}: ${reason}`.slice(0, 500)) },
    { returnDocument: 'after' },
  ).lean();

  await notifyOrderRefunded(updatedOrder, refund.amountPaise);
  return updatedOrder;
}
