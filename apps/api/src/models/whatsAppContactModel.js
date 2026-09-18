import mongoose from 'mongoose';
import { SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { derivePhoneLast10 } from '../utils.js';

// Bounded audit trails so a contact document never grows without limit
export const CREDIT_GRANT_HISTORY_LIMIT = 100;
export const APPLIED_PAYMENT_HISTORY_LIMIT = 200;

const creditGrantSchema = new mongoose.Schema(
  {
    Messages: { type: Number, required: true, min: 1 },
    Reason: { type: String, required: true, trim: true, maxlength: 200 },
    GrantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// One document per WhatsApp number that has messaged LexBridge
const whatsAppContactSchema = new mongoose.Schema(
  {
    // E.164 digits without '+', exactly as WhatsApp sends them (wa_id)
    Phone: { type: String, required: true, unique: true, match: /^\d{8,15}$/ },
    PhoneLast10: { type: String, default: '' },
    ProfileName: { type: String, default: '', trim: true, maxlength: 120 },
    FreeMessagesUsed: { type: Number, default: 0, min: 0 },
    PaidMessagesRemaining: { type: Number, default: 0, min: 0 },
    IsOptedOut: { type: Boolean, default: false },
    optedOutAt: { type: Date, default: null },
    ConsentNoticeSentAt: { type: Date, default: null },
    LastInboundAt: { type: Date, default: null },
    LastSuggestedCategory: { type: String, enum: SERVICE_CATEGORY_KEYS, default: 'other' },
    LastHandoffReference: { type: String, default: '' },
    lastHandoffAt: { type: Date, default: null },
    CreditGrants: { type: [creditGrantSchema], default: [] },
    // Payment link ids already credited; makes crediting idempotent in a single atomic update
    AppliedPaymentLinkIds: { type: [String], default: [], select: false },
    // Per-contact lock so one number's messages are handled one at a time, in order
    processingLockedUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true, collection: 'whatsAppContacts' },
);

whatsAppContactSchema.pre('validate', function setPhoneLast10() {
  this.PhoneLast10 = derivePhoneLast10(this.Phone);
});

whatsAppContactSchema.index({ LastInboundAt: -1 });
whatsAppContactSchema.index({ PhoneLast10: 1, LastInboundAt: -1 });
whatsAppContactSchema.index({ ProfileName: 1 });

export const WhatsAppContactModel = mongoose.model('WhatsAppContact', whatsAppContactSchema);
