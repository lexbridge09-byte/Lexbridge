import mongoose from 'mongoose';
import { DEADLINE_KIND_KEYS, DEADLINE_SOURCES, DEADLINE_STATUSES } from '@lexbridge/shared';

// A date the client must not miss: a hearing, a notice reply, a filing. Reminders go out at T-7 and T-1 days.
const deadlineSchema = new mongoose.Schema(
  {
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Title: { type: String, required: true, trim: true, maxlength: 160 },
    Kind: { type: String, enum: DEADLINE_KIND_KEYS, default: 'other' },
    DueAt: { type: Date, required: true },
    Notes: { type: String, trim: true, default: '', maxlength: 1000 },
    Source: { type: String, enum: DEADLINE_SOURCES, default: 'client' },
    Consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
    ConsultationReference: { type: String, default: '' },
    Status: { type: String, enum: DEADLINE_STATUSES, default: 'active' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'deadlines' },
);

deadlineSchema.index({ Client: 1, Status: 1, DueAt: 1 });
deadlineSchema.index({ Consultation: 1 }, { partialFilterExpression: { Consultation: { $type: 'objectId' } } });

export const DeadlineModel = mongoose.model('Deadline', deadlineSchema);
