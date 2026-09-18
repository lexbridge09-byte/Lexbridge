import mongoose from 'mongoose';
import { REMINDER_CATEGORIES, REMINDER_STATUSES, REMINDER_TYPES } from '@lexbridge/shared';

export const REMINDER_CHANNELS = ['email', 'whatsapp'];
export const REMINDER_RELATED_MODELS = ['Document', 'Order', 'ConsultationDraft', 'Deadline', 'FeedbackRequest'];

const recipientSchema = new mongoose.Schema(
  {
    FullName: { type: String, default: '', maxlength: 120 },
    Email: { type: String, default: '', lowercase: true, trim: true },
    Phone: { type: String, default: '', maxlength: 20 },
    PreferredLanguage: { type: String, default: 'en', maxlength: 5 },
    // WhatsApp consent given on the form that started this reminder (service updates only)
    WhatsAppOptIn: { type: Boolean, default: false },
  },
  { _id: false },
);

// A message scheduled for a future moment. The reminders worker hands due ones to the notification outbox.
const reminderSchema = new mongoose.Schema(
  {
    Type: { type: String, enum: REMINDER_TYPES, required: true },
    Category: { type: String, enum: REMINDER_CATEGORIES, required: true },
    // Urgent service reminders (e.g. a deadline tomorrow) may go out during quiet hours; others wait until morning
    IsUrgent: { type: Boolean, default: false },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    Recipient: { type: recipientSchema, required: true },
    RelatedModel: { type: String, enum: REMINDER_RELATED_MODELS, required: true },
    RelatedId: { type: mongoose.Schema.Types.ObjectId, required: true },
    RelatedReference: { type: String, default: '', maxlength: 60 },
    DueAt: { type: Date, required: true },
    Channels: { type: [{ type: String, enum: REMINDER_CHANNELS }], default: ['email'] },
    // Template values and links, fixed when the reminder is scheduled
    Payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    Status: { type: String, enum: REMINDER_STATUSES, default: 'pending' },
    Attempts: { type: Number, default: 0 },
    LastError: { type: String, default: '', maxlength: 1000 },
    // One document per reminder occurrence (e.g. "document-renewal:<id>:30d"), so scheduling twice never sends twice
    IdempotencyKey: { type: String, required: true, maxlength: 200 },
    lockedUntil: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    SentChannels: { type: [{ type: String, enum: REMINDER_CHANNELS }], default: [] },
    SkipReason: { type: String, default: '', maxlength: 60 },
    CancelReason: { type: String, default: '', maxlength: 60 },
    finishedAt: { type: Date, default: null },
    // TTL: finished reminders are removed after a retention period; unfinished ones never expire
    expiresAt: { type: Date, default: null, expires: 0 },
  },
  { timestamps: true, collection: 'reminders', minimize: false },
);

reminderSchema.index({ IdempotencyKey: 1 }, { unique: true });
// Worker claim: due pending reminders, and stale locks from a worker that died
reminderSchema.index({ Status: 1, DueAt: 1 });
reminderSchema.index({ Status: 1, lockedUntil: 1 });
// Cancelling the open reminders of one related record
reminderSchema.index({ RelatedModel: 1, RelatedId: 1, Status: 1 });
// Marketing frequency cap per person
reminderSchema.index({ 'Recipient.Email': 1, Category: 1, sentAt: -1 });
// Retention metrics and admin list
reminderSchema.index({ Type: 1, Status: 1, sentAt: -1 });
reminderSchema.index({ Client: 1, DueAt: 1 });

export const ReminderModel = mongoose.model('Reminder', reminderSchema);
