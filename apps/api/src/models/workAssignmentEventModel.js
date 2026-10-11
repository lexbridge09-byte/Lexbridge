import mongoose from 'mongoose';

const workAssignmentEventSchema = new mongoose.Schema(
  {
    WorkKind: { type: String, required: true, maxlength: 40 },
    ReferenceCode: { type: String, required: true, maxlength: 80 },
    EventType: { type: String, enum: ['assigned', 'reassigned', 'unassigned', 'status-changed'], required: true },
    Actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    PreviousAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    NewAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    Note: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'workAssignmentEvents' },
);

workAssignmentEventSchema.index({ WorkKind: 1, ReferenceCode: 1, createdAt: -1 });
workAssignmentEventSchema.index({ NewAssignee: 1, createdAt: -1 });

export const WorkAssignmentEventModel = mongoose.model('WorkAssignmentEvent', workAssignmentEventSchema);
