import mongoose from 'mongoose';
import { CONSULTATION_MODE_KEYS, CONSULTATION_STATUSES, CONSULTATION_TYPE_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';

const consultationSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
    ConsultationType: { type: String, enum: CONSULTATION_TYPE_KEYS, required: true },
    Mode: { type: String, enum: CONSULTATION_MODE_KEYS, required: true },
    StartsAt: { type: Date, required: true },
    DurationMinutes: { type: Number, required: true },
    Phone: { type: String, required: true, trim: true, maxlength: 20 },
    Description: { type: String, required: true, maxlength: 3000 },
    Status: { type: String, enum: CONSULTATION_STATUSES, default: 'scheduled' },
    MeetingLink: { type: String, default: '', maxlength: 500 },
    AdminNote: { type: String, default: '', maxlength: 2000 },
    AssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    WhatsAppOptIn: { type: Boolean, default: false },
    PreferredLanguage: { type: String, enum: SUPPORTED_LANGUAGE_KEYS, default: 'en' },
    ConsentGiven: { type: Boolean, required: true },
    consentedAt: { type: Date, required: true },
    cancelledAt: { type: Date },
  },
  { timestamps: true, collection: 'consultations' },
);

consultationSchema.index({ Client: 1, StartsAt: -1 });
consultationSchema.index({ Status: 1, StartsAt: 1 });
consultationSchema.index({ StartsAt: 1 });

export const ConsultationModel = mongoose.model('Consultation', consultationSchema);
