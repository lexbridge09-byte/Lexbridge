import mongoose from 'mongoose';
import { CONSENT_CATEGORIES, CONSENT_CHANNELS } from '@lexbridge/shared';

export const CONSENT_HISTORY_LIMIT = 50;

const channelConsentSchema = new mongoose.Schema(
  {
    OptedIn: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null },
    // Where the choice was made, e.g. "preferences", "checkout", "whatsapp-stop", "email-unsubscribe:document-renewal"
    Source: { type: String, default: '', maxlength: 80 },
  },
  { _id: false },
);

const consentHistorySchema = new mongoose.Schema(
  {
    Channel: { type: String, enum: CONSENT_CHANNELS, required: true },
    Category: { type: String, enum: CONSENT_CATEGORIES, required: true },
    OptedIn: { type: Boolean, required: true },
    Source: { type: String, default: '', maxlength: 80 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/*
  Messaging consent per person, keyed by email so guests and signed-in clients share one record.
  Service updates (about something the person asked for) use ServiceWhatsApp; email service updates are always sent.
  Marketing needs an explicit opt-in per channel, and withdrawing is one call (DPDP).
*/
const consentSchema = new mongoose.Schema(
  {
    Email: { type: String, required: true, lowercase: true, trim: true },
    User: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    Phone: { type: String, default: '', maxlength: 20 },
    PhoneLast10: { type: String, default: '' },
    ServiceWhatsApp: { type: channelConsentSchema, default: () => ({}) },
    MarketingWhatsApp: { type: channelConsentSchema, default: () => ({}) },
    MarketingSms: { type: channelConsentSchema, default: () => ({}) },
    MarketingEmail: { type: channelConsentSchema, default: () => ({}) },
    History: {
      type: [consentHistorySchema],
      default: [],
      validate: { validator: (entries) => entries.length <= CONSENT_HISTORY_LIMIT, message: `Up to ${CONSENT_HISTORY_LIMIT} entries` },
    },
  },
  { timestamps: true, collection: 'consents' },
);

consentSchema.index({ Email: 1 }, { unique: true });
consentSchema.index({ User: 1 }, { partialFilterExpression: { User: { $type: 'objectId' } } });
consentSchema.index({ PhoneLast10: 1 });
// Opt-out rate per template (history entries carry the template in Source)
consentSchema.index({ 'History.Source': 1, 'History.changedAt': -1 });

export const ConsentModel = mongoose.model('Consent', consentSchema);
