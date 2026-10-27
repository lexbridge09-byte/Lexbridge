import { releaseSlotSeat } from './slotSeats.js';

export const CLIENT_CONSULTATION_FIELDS = [
  '_id',
  'ReferenceCode',
  'ConsultationType',
  'Mode',
  'StartsAt',
  'DurationMinutes',
  'Description',
  'Status',
  'MeetingLink',
  'createdAt',
];

export function extractClientConsultation(consultation) {
  return Object.fromEntries(CLIENT_CONSULTATION_FIELDS.map((field) => [field, consultation[field]]));
}

// Gives back this consultation's seat (a time can hold several clients when several lawyers work)
export async function releaseConsultationSlot(consultation) {
  await releaseSlotSeat(consultation.Slot, consultation._id);
}
