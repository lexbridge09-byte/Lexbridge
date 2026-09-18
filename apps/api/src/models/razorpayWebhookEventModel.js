import mongoose from 'mongoose';

// Processed Razorpay webhook event ids (x-razorpay-event-id), so redeliveries are skipped quickly
const razorpayWebhookEventSchema = new mongoose.Schema(
  {
    EventId: { type: String, required: true, unique: true },
    Event: { type: String, default: '', maxlength: 80 },
    Outcome: { type: String, default: '', maxlength: 80 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true, collection: 'razorpayWebhookEvents' },
);

export const RazorpayWebhookEventModel = mongoose.model('RazorpayWebhookEvent', razorpayWebhookEventSchema);
