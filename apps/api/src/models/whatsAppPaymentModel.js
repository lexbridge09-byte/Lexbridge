import mongoose from 'mongoose';

export const WHATSAPP_PAYMENT_STATUSES = ['created', 'paid', 'expired', 'cancelled'];

// A Razorpay Payment Link for a WhatsApp message pack
const whatsAppPaymentSchema = new mongoose.Schema(
  {
    Contact: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppContact', required: true },
    RazorpayPaymentLinkId: { type: String, required: true, unique: true },
    ReferenceId: { type: String, required: true, unique: true, maxlength: 40 },
    ShortUrl: { type: String, required: true },
    AmountPaise: { type: Number, required: true, min: 100 },
    MessagesGranted: { type: Number, required: true, min: 1 },
    Status: { type: String, enum: WHATSAPP_PAYMENT_STATUSES, default: 'created' },
    RazorpayPaymentId: { type: String },
    paidAt: { type: Date, default: null },
    creditedAt: { type: Date, default: null },
    linkExpiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'whatsAppPayments' },
);

whatsAppPaymentSchema.index({ Contact: 1, Status: 1, linkExpiresAt: -1 });
whatsAppPaymentSchema.index({ Contact: 1, createdAt: -1 });
whatsAppPaymentSchema.index({ Status: 1, createdAt: -1 });
whatsAppPaymentSchema.index({ createdAt: -1 });
whatsAppPaymentSchema.index(
  { RazorpayPaymentId: 1 },
  { unique: true, partialFilterExpression: { RazorpayPaymentId: { $type: 'string' } } },
);

export const WhatsAppPaymentModel = mongoose.model('WhatsAppPayment', whatsAppPaymentSchema);
