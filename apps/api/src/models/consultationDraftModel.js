import mongoose from 'mongoose';
import { CONSULTATION_DRAFT_STATUSES, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';

// Captured when a signed-in client starts the booking flow, so an unfinished booking can get a gentle reminder
const consultationDraftSchema = new mongoose.Schema(
  {
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    FullName: { type: String, trim: true, default: '', maxlength: 120 },
    Email: { type: String, required: true, lowercase: true, trim: true },
    Phone: { type: String, trim: true, default: '', maxlength: 20 },
    PreferredLanguage: { type: String, enum: SUPPORTED_LANGUAGE_KEYS, default: 'en' },
    ConsultationType: { type: String, default: '', maxlength: 40 },
    Mode: { type: String, default: '', maxlength: 20 },
    // The client ticked "Remind me to finish booking": a service reminder that needs no marketing consent
    RemindMe: { type: Boolean, default: false },
    WhatsAppOptIn: { type: Boolean, default: false },
    ConsentGiven: { type: Boolean, required: true },
    Status: { type: String, enum: CONSULTATION_DRAFT_STATUSES, default: 'open' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'consultationDrafts' },
);

consultationDraftSchema.index({ Client: 1, Status: 1, createdAt: -1 });

export const ConsultationDraftModel = mongoose.model('ConsultationDraft', consultationDraftSchema);
