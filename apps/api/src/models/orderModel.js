import mongoose from 'mongoose';
import { ORDER_STATUSES, PRODUCT_CATEGORY_KEYS, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { applyPhoneLast10Hooks } from './phoneSearchHooks.js';

export const ORDER_ITEM_LIMIT = 5;
export const ORDER_REFUND_LIMIT = 20;

const orderItemSchema = new mongoose.Schema(
  {
    Product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    Slug: { type: String, required: true },
    // Title and price as they were at checkout, so later catalogue edits don't change past orders
    TitleSnapshot: { type: String, required: true, maxlength: 160 },
    Category: { type: String, enum: PRODUCT_CATEGORY_KEYS, required: true },
    ServiceCategory: { type: String, enum: SERVICE_CATEGORY_KEYS, required: true },
    PricePaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderStatusEntrySchema = new mongoose.Schema(
  {
    Status: { type: String, enum: ORDER_STATUSES, required: true },
    Note: { type: String, default: '', maxlength: 500 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const refundSchema = new mongoose.Schema(
  {
    RazorpayRefundId: { type: String, required: true },
    AmountPaise: { type: Number, required: true, min: 1 },
    // pending | processed | failed, as reported by Razorpay
    Status: { type: String, default: 'pending', maxlength: 20 },
    Reason: { type: String, default: '', maxlength: 500 },
    CreatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    FullName: { type: String, required: true, trim: true, maxlength: 120 },
    Email: { type: String, required: true, lowercase: true, trim: true },
    Phone: { type: String, required: true, trim: true, maxlength: 20 },
    PhoneLast10: { type: String, default: '' },
    Description: { type: String, default: '', maxlength: 5000 },
    PreferredLanguage: { type: String, enum: SUPPORTED_LANGUAGE_KEYS, default: 'en' },
    WhatsAppOptIn: { type: Boolean, default: false },
    Items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => items.length >= 1 && items.length <= ORDER_ITEM_LIMIT,
        message: `An order has 1 to ${ORDER_ITEM_LIMIT} items`,
      },
    },
    SubtotalPaise: { type: Number, required: true, min: 0 },
    DiscountPaise: { type: Number, default: 0, min: 0 },
    TotalPaise: { type: Number, required: true, min: 0 },
    CouponCode: { type: String, default: '' },
    Coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    RazorpayOrderId: { type: String },
    RazorpayPaymentId: { type: String },
    Status: { type: String, enum: ORDER_STATUSES, default: 'created' },
    StatusHistory: { type: [orderStatusEntrySchema], default: [] },
    RefundedPaise: { type: Number, default: 0, min: 0 },
    Refunds: {
      type: [refundSchema],
      default: [],
      validate: { validator: (entries) => entries.length <= ORDER_REFUND_LIMIT, message: `Up to ${ORDER_REFUND_LIMIT} refunds` },
    },
    // The service request the team works from, created once payment is confirmed
    ServiceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    ServiceRequestReference: { type: String, default: '' },
    ConsentGiven: { type: Boolean, required: true },
    consentedAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    // Set by whichever of checkout verification or the webhook fulfils the order first
    fulfillmentStartedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'orders' },
);

applyPhoneLast10Hooks(orderSchema);

orderSchema.index({ Client: 1, createdAt: -1 });
orderSchema.index({ Email: 1, createdAt: -1 });
orderSchema.index({ Status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ PhoneLast10: 1, createdAt: -1 });
orderSchema.index({ paidAt: -1 });
// Per-customer coupon limits count paid orders by code and email
orderSchema.index({ CouponCode: 1, Email: 1, Status: 1 });
// Deleting a product checks whether any order refers to it
orderSchema.index({ 'Items.Product': 1 });
orderSchema.index({ 'Refunds.RazorpayRefundId': 1 }, { partialFilterExpression: { 'Refunds.RazorpayRefundId': { $type: 'string' } } });
orderSchema.index({ RazorpayOrderId: 1 }, { unique: true, partialFilterExpression: { RazorpayOrderId: { $type: 'string' } } });
orderSchema.index({ RazorpayPaymentId: 1 }, { unique: true, partialFilterExpression: { RazorpayPaymentId: { $type: 'string' } } });
orderSchema.index({ FullName: 'text' }, { name: 'FullName_text', default_language: 'none' });

export const OrderModel = mongoose.model('Order', orderSchema);
