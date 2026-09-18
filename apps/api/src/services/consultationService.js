import { SlotModel } from '../models/index.js';

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

// Only releases the slot if it still points at this consultation
export async function releaseConsultationSlot(consultation) {
  await SlotModel.updateOne(
    { _id: consultation.Slot, Consultation: consultation._id },
    { $set: { Status: 'open', Consultation: null } },
  );
}
