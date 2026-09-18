import { Router } from 'express';
import { z } from 'zod';
import { CONSULTATION_STATUSES } from '@lexbridge/shared';
import { ConsultationModel } from '../../models/index.js';
import {
  notifyConsultationCancelled,
  notifyMeetingLinkAdded,
  releaseConsultationSlot,
} from '../../services/index.js';
import { paginationSchema } from '../../utils.js';

const CLIENT_POPULATE_FIELDS = 'FullName Email Phone';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(CONSULTATION_STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const updateSchema = z
  .object({
    Status: z.enum(CONSULTATION_STATUSES).optional(),
    MeetingLink: z
      .union([z.url({ protocol: /^https$/, error: 'Enter a meeting link starting with https://' }), z.literal('')])
      .optional(),
    AdminNote: z.string().trim().max(2000).optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

export const adminConsultationsRouter = Router();

adminConsultationsRouter.get('/', async (req, res) => {
  const { page, limit, status, from, to } = listQuerySchema.parse(req.query);
  const filter = {};
  if (status) filter.Status = status;
  if (from || to) {
    filter.StartsAt = {};
    if (from) filter.StartsAt.$gte = from;
    if (to) filter.StartsAt.$lte = to;
  }

  const [items, total] = await Promise.all([
    ConsultationModel.find(filter)
      .sort({ StartsAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('Client', CLIENT_POPULATE_FIELDS)
      .lean(),
    ConsultationModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminConsultationsRouter.patch('/:referenceCode', async (req, res) => {
  const input = updateSchema.parse(req.body);
  const consultation = await ConsultationModel.findOne({ ReferenceCode: req.params.referenceCode });
  if (!consultation) return res.status(404).json({ error: 'Consultation not found' });

  // The slot may already be rebooked, so a cancellation can't be undone here
  if (consultation.Status === 'cancelled' && input.Status && input.Status !== 'cancelled') {
    return res.status(400).json({ error: 'A cancelled consultation cannot be reopened. Ask the client to book a new slot.' });
  }

  const isBeingCancelled = input.Status === 'cancelled' && consultation.Status !== 'cancelled';
  const hasNewMeetingLink = Boolean(input.MeetingLink) && input.MeetingLink !== consultation.MeetingLink;

  if (input.Status) consultation.Status = input.Status;
  if (input.MeetingLink !== undefined) consultation.MeetingLink = input.MeetingLink;
  if (input.AdminNote !== undefined) consultation.AdminNote = input.AdminNote;
  if (isBeingCancelled) consultation.cancelledAt = new Date();

  await consultation.save();
  if (isBeingCancelled) await releaseConsultationSlot(consultation);
  await consultation.populate('Client', CLIENT_POPULATE_FIELDS);

  if (isBeingCancelled) {
    await notifyConsultationCancelled(consultation, consultation.Client, 'admin');
  } else if (hasNewMeetingLink && consultation.Status === 'scheduled') {
    await notifyMeetingLinkAdded(consultation, consultation.Client);
  }

  res.json({ consultation });
});
