import { SlotModel } from '../models/index.js';

// Older slots have no Capacity/BookedCount yet: treat them as one seat, taken if a consultation is attached
const CAPACITY = { $ifNull: ['$Capacity', 1] };
const BOOKED = { $ifNull: ['$BookedCount', { $cond: [{ $ifNull: ['$Consultation', false] }, 1, 0] }] };

/*
  Atomically takes one seat at a time slot. Only matches an open, future slot with a free seat, so two
  clients can never take the last seat together. Returns the updated slot, or null if it's full or gone.
*/
export async function claimSlotSeat(slotId, consultationId, now = new Date()) {
  return SlotModel.findOneAndUpdate(
    { _id: slotId, Status: 'open', StartsAt: { $gt: now }, $expr: { $lt: [BOOKED, CAPACITY] } },
    [
      {
        $set: {
          BookedCount: { $add: [BOOKED, 1] },
          Consultations: { $concatArrays: [{ $ifNull: ['$Consultations', []] }, [consultationId]] },
          Consultation: { $ifNull: ['$Consultation', consultationId] },
          Status: { $cond: [{ $gte: [{ $add: [BOOKED, 1] }, CAPACITY] }, 'booked', 'open'] },
        },
      },
    ],
    { returnDocument: 'after', updatePipeline: true },
  ).lean();
}

// Gives one seat back (cancellation, or a failed booking). Only acts if this consultation holds a seat.
export async function releaseSlotSeat(slotId, consultationId) {
  if (!slotId) return;
  const remaining = { $filter: { input: { $ifNull: ['$Consultations', []] }, cond: { $ne: ['$$this', consultationId] } } };
  await SlotModel.updateOne(
    { _id: slotId, $or: [{ Consultations: consultationId }, { Consultation: consultationId }] },
    [
      {
        $set: {
          BookedCount: { $max: [0, { $subtract: [BOOKED, 1] }] },
          Consultations: remaining,
          Consultation: { $cond: [{ $eq: ['$Consultation', consultationId] }, { $arrayElemAt: [remaining, 0] }, '$Consultation'] },
          Status: { $cond: [{ $eq: ['$Status', 'blocked'] }, 'blocked', 'open'] },
        },
      },
    ],
    { updatePipeline: true },
  );
}
