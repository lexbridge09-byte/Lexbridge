import mongoose from 'mongoose';
import { SLOT_STATUSES } from '@lexbridge/shared';

/*
  A bookable start time. With several lawyers working, one time takes several clients (Cal.com "seats"):
  Capacity = lawyers available, BookedCount = seats taken. Status stays 'open' until every seat is taken.
  Consultation keeps the first booking for older readers; Consultations lists them all.
*/
const slotSchema = new mongoose.Schema(
  {
    StartsAt: { type: Date, required: true, unique: true },
    DurationMinutes: { type: Number, required: true, min: 10, max: 240 },
    Status: { type: String, enum: SLOT_STATUSES, default: 'open' },
    Capacity: { type: Number, default: 1, min: 1, max: 50 },
    BookedCount: { type: Number, default: 0, min: 0 },
    Consultations: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Consultation' }], default: [] },
    Consultation: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null },
  },
  { timestamps: true, collection: 'consultationSlots' },
);

slotSchema.index({ Status: 1, StartsAt: 1 });

export const SlotModel = mongoose.model('Slot', slotSchema);
