import mongoose from 'mongoose';
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from '@lexbridge/shared';

export const FEEDBACK_RELATED_MODELS = ['Order', 'Consultation', 'ServiceRequest'];

/*
  A single-use feedback link. csat = "How easy was it to get help?" (1–5); nps = recommend score (0–10).
  Only a SHA-256 hash of the link token is stored. Always about the service, never the legal outcome.
*/
const feedbackRequestSchema = new mongoose.Schema(
  {
    Type: { type: String, enum: FEEDBACK_TYPES, required: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    Email: { type: String, required: true, lowercase: true, trim: true },
    Phone: { type: String, default: '', maxlength: 20 },
    FullName: { type: String, default: '', maxlength: 120 },
    PreferredLanguage: { type: String, default: 'en', maxlength: 5 },
    RelatedModel: { type: String, enum: FEEDBACK_RELATED_MODELS, required: true },
    RelatedReference: { type: String, required: true, maxlength: 60 },
    TokenHash: { type: String, required: true },
    Status: { type: String, enum: FEEDBACK_STATUSES, default: 'pending' },
    Score: { type: Number, min: 0, max: 10, default: null },
    Reason: { type: String, trim: true, default: '', maxlength: 1000 },
    answeredAt: { type: Date, default: null },
    ExpiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'feedbackRequests' },
);

feedbackRequestSchema.index({ TokenHash: 1 }, { unique: true });
// One service-ease question per completed order or consultation
feedbackRequestSchema.index(
  { Type: 1, RelatedModel: 1, RelatedReference: 1 },
  { unique: true, partialFilterExpression: { Type: 'csat' } },
);
// NPS cooldown and "has this person given positive feedback" checks
feedbackRequestSchema.index({ Email: 1, Type: 1, createdAt: -1 });
// Admin list and aggregates
feedbackRequestSchema.index({ Type: 1, Status: 1, answeredAt: -1 });
feedbackRequestSchema.index({ createdAt: -1 });

export const FeedbackRequestModel = mongoose.model('FeedbackRequest', feedbackRequestSchema);
