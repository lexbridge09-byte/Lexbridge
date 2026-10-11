import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    WorkKind: { type: String, required: true, maxlength: 40 },
    WorkReferenceCode: { type: String, required: true, maxlength: 80 },
    Title: { type: String, required: true, trim: true, maxlength: 160 },
    Notes: { type: String, default: '', maxlength: 2000 },
    NextAction: { type: String, default: '', maxlength: 1000 },
    DueAt: { type: Date, required: true },
    Priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    Status: { type: String, enum: ['open', 'completed', 'cancelled'], default: 'open' },
    AssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    AssignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    AssignedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'followUps' },
);

followUpSchema.index({ AssignedTo: 1, Status: 1, DueAt: 1 });
followUpSchema.index({ WorkKind: 1, WorkReferenceCode: 1 });

export const FollowUpModel = mongoose.model('FollowUp', followUpSchema);
