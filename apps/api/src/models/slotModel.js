import mongoose from 'mongoose';
import { SLOT_STATUSES } from '@lexbridge/shared';

const slotSchema = new mongoose.Schema(
  {
    // Unique: the in-house team takes one consultation per start time
    StartsAt: { type: Date, required: true, unique: true },
    DurationMinutes: { type: Number, required: true, min: 10, max: 240 },
    Status: { type: String, enum: SLOT_STATUSES, default: 'open' },
    Consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
  },
  { timestamps: true, collection: 'consultationSlots' },
);

slotSchema.index({ Status: 1, StartsAt: 1 });

export const SlotModel = mongoose.model('Slot', slotSchema);
