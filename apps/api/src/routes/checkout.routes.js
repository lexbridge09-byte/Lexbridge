import { Router } from 'express';
import { z } from 'zod';
import { SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { attachUserIfPresent, createRateLimiter, requireFeature } from '../middleware/index.js';
import { createCheckoutOrder, extractClientOrder, quoteOrder, verifyCheckoutPayment } from '../services/index.js';

const createOrderLimiter = createRateLimiter({
  name: 'checkout-orders',
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'Too many checkout attempts. Please try again later.',
});

const couponLimiter = createRateLimiter({
  name: 'checkout-coupons',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many coupon attempts. Please try again in a few minutes.',
});

const verifyLimiter = createRateLimiter({
  name: 'checkout-verify',
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: 'Too many attempts. Please try again in a few minutes.',
});

const itemsSchema = z
  .array(z.object({ Slug: z.string().trim().toLowerCase().min(1).max(120) }))
  .min(1, 'Choose a service')
  .max(5, 'Choose up to 5 services per order');

const couponCodeSchema = z.string().trim().toUpperCase().max(40);

const validateCouponSchema = z.object({
  Items: itemsSchema,
  CouponCode: couponCodeSchema.min(1, 'Enter a coupon code'),
  Email: z.email().max(254).optional(),
});

// z.object drops unknown keys, so any price, amount or total the browser sends is ignored
const createOrderSchema = z.object({
  Items: itemsSchema,
  CouponCode: couponCodeSchema.optional().default(''),
  FullName: z.string().trim().min(2, 'Enter your full name').max(120),
  Email: z.email('Enter a valid email address').max(254),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  Description: z.string().trim().max(5000).optional().default(''),
  PreferredLanguage: z.enum(SUPPORTED_LANGUAGE_KEYS).optional().default('en'),
  WhatsAppOptIn: z.boolean().optional().default(false),
  ConsentGiven: z.literal(true, { error: 'Please accept the consent to continue' }),
});

// Field names exactly as Razorpay Checkout's success handler returns them
const verifySchema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(100),
  razorpay_payment_id: z.string().trim().min(1).max(100),
  razorpay_signature: z.string().trim().min(1).max(200),
});

export const checkoutRouter = Router();

checkoutRouter.post('/coupons/validate', requireFeature('coupons'), couponLimiter, async (req, res) => {
  const input = validateCouponSchema.parse(req.body);
  const quote = await quoteOrder({
    slugs: input.Items.map((item) => item.Slug),
    couponCode: input.CouponCode,
    email: input.Email,
  });
  res.json({
    valid: true,
    CouponCode: quote.coupon.Code,
    Description: quote.coupon.Description,
    SubtotalPaise: quote.subtotalPaise,
    DiscountPaise: quote.discountPaise,
    TotalPaise: quote.totalPaise,
  });
});

checkoutRouter.post('/orders', createOrderLimiter, attachUserIfPresent, async (req, res) => {
  const input = createOrderSchema.parse(req.body);
  const { order, checkout } = await createCheckoutOrder({ input, user: req.user });
  res.status(201).json({ order: extractClientOrder(order), checkout });
});

checkoutRouter.post('/verify', verifyLimiter, async (req, res) => {
  const input = verifySchema.parse(req.body);
  const order = await verifyCheckoutPayment({
    razorpayOrderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  });
  res.json({ order: extractClientOrder(order) });
});
