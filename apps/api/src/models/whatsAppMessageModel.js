import mongoose from 'mongoose';

export const WHATSAPP_MESSAGE_DIRECTIONS = ['in', 'out'];
// user: inbound text; assistant: AI reply; notice: consent notice; payment-link; handoff; system: commands and errors
export const WHATSAPP_MESSAGE_KINDS = ['user', 'assistant', 'notice', 'payment-link', 'handoff', 'system'];
export const WHATSAPP_CHARGE_TYPES = ['none', 'free', 'paid', 'refunded'];

const whatsAppMessageSchema = new mongoose.Schema(
  {
    Contact: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppContact', required: true },
    Direction: { type: String, enum: WHATSAPP_MESSAGE_DIRECTIONS, required: true },
    // Meta's wamid; inbound ids are unique, which also guards against duplicate webhook deliveries
    WaMessageId: { type: String },
    MessageType: { type: String, default: 'text', maxlength: 30 },
    Body: { type: String, default: '', maxlength: 4096 },
    Kind: { type: String, enum: WHATSAPP_MESSAGE_KINDS, required: true },
    ChargeType: { type: String, enum: WHATSAPP_CHARGE_TYPES, default: 'none' },
    // TTL index: conversation content is deleted after WHATSAPP_MESSAGE_RETENTION_DAYS (DPDP storage limitation)
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true, collection: 'whatsAppMessages' },
);

whatsAppMessageSchema.index({ Contact: 1, createdAt: -1 });
whatsAppMessageSchema.index(
  { WaMessageId: 1 },
  { unique: true, partialFilterExpression: { WaMessageId: { $type: 'string' } } },
);

export const WhatsAppMessageModel = mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
