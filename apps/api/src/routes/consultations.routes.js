import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { CANCELLATION_NOTICE_HOURS, CONSULTATION_MODE_KEYS, CONSULTATION_TYPE_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { createRateLimiter, requireAuth } from '../middleware/index.js';
import { ConsultationModel, SlotModel, UserModel } from '../models/index.js';
import {
  CLIENT_CONSULTATION_FIELDS,
  extractClientConsultation,
  notifyConsultationBooked,
  notifyConsultationCancelled,
  releaseConsultationSlot,
} from '../services/index.js';
import { createWithUniqueReference, objectIdSchema } from '../utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 21;
const MAX_WINDOW_DAYS = 60;
const MAX_CLIENT_CONSULTATIONS = 200;

const bookingLimiter = createRateLimiter({
  name: 'consultations-book',
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many booking attempts. Please try again later.',
});

const slotsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const bookingSchema = z.object({
  SlotId: objectIdSchema.or(z.literal('')).refine(Boolean, 'Choose a date and time'),
  ConsultationType: z.enum(CONSULTATION_TYPE_KEYS, { error: 'Choose a consultation type' }),
  Mode: z.enum(CONSULTATION_MODE_KEYS, { error: 'Choose phone or video' }),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  Description: z.string().trim().min(10, 'Briefly describe what you would like to discuss').max(3000),
  ConsentGiven: z.literal(true, { error: 'Please accept the consent to continue' }),
  WhatsAppOptIn: z.boolean().optional().default(false),
  PreferredLanguage: z.enum(SUPPORTED_LANGUAGE_KEYS).optional().default('en'),
});

export const consultationsRouter = Router();

consultationsRouter.get('/slots', async (req, res) => {
  const query = slotsQuerySchema.parse(req.query);
  const now = new Date();
  const from = query.from && query.from > now ? query.from : now;
  const maxTo = new Date(from.getTime() + MAX_WINDOW_DAYS * DAY_MS);
  const requestedTo = query.to ?? new Date(from.getTime() + DEFAULT_WINDOW_DAYS * DAY_MS);
  const to = requestedTo < maxTo ? requestedTo : maxTo;

  if (to <= from) return res.json({ slots: [] });

  const slots = await SlotModel.find({ Status: 'open', StartsAt: { $gt: from, $lte: to } })
    .select('StartsAt DurationMinutes')
    .sort({ StartsAt: 1 })
    .limit(500)
    .lean();
  res.json({ slots });
});

consultationsRouter.post('/', requireAuth, bookingLimiter, async (req, res) => {
  const input = bookingSchema.parse(req.body);
  const now = new Date();
  const consultationId = new mongoose.Types.ObjectId();

  // Atomic claim: only one booking can move an open slot to booked
  const slot = await SlotModel.findOneAndUpdate(
    { _id: input.SlotId, Status: 'open', StartsAt: { $gt: now } },
    { $set: { Status: 'booked', Consultation: consultationId } },
    { returnDocument: 'after' },
  ).lean();
  if (!slot) {
    return res.status(409).json({ error: 'That time is no longer available. Please choose another slot.' });
  }

  let consultation;
  try {
    consultation = await createWithUniqueReference('LC', (referenceCode) => ConsultationModel.create({
      _id: consultationId,
      ReferenceCode: referenceCode,
      Client: req.user.id,
      Slot: slot._id,
      ConsultationType: input.ConsultationType,
      Mode: input.Mode,
      StartsAt: slot.StartsAt,
      DurationMinutes: slot.DurationMinutes,
      Phone: input.Phone,
      Description: input.Description,
      WhatsAppOptIn: input.WhatsAppOptIn,
      PreferredLanguage: input.PreferredLanguage,
      ConsentGiven: true,
      consentedAt: now,
    }));
  } catch (err) {
    await SlotModel.updateOne(
      { _id: slot._id, Consultation: consultationId },
      { $set: { Status: 'open', Consultation: null } },
    );
    throw err;
  }

  const client = await UserModel.findById(req.user.id).select('FullName Email Phone').lean();
  if (client && !client.Phone) {
    await UserModel.updateOne({ _id: client._id, Phone: '' }, { $set: { Phone: input.Phone } });
  }

  await notifyConsultationBooked(consultation, client);
  res.status(201).json({ consultation: extractClientConsultation(consultation) });
});

consultationsRouter.get('/mine', requireAuth, async (req, res) => {
  const consultations = await ConsultationModel.find({ Client: req.user.id })
    .select(CLIENT_CONSULTATION_FIELDS.join(' '))
    .sort({ StartsAt: -1 })
    .limit(MAX_CLIENT_CONSULTATIONS)
    .lean();
  const now = Date.now();
  const isUpcoming = (consultation) => consultation.Status === 'scheduled' && new Date(consultation.StartsAt) >= now;

  const upcoming = consultations.filter(isUpcoming).sort((a, b) => a.StartsAt - b.StartsAt);
  const past = consultations.filter((consultation) => !isUpcoming(consultation));

  res.json({ consultations: [...upcoming, ...past].map(extractClientConsultation) });
});

consultationsRouter.post('/mine/:referenceCode/cancel', requireAuth, async (req, res) => {
  const consultation = await ConsultationModel.findOne({
    ReferenceCode: req.params.referenceCode,
    Client: req.user.id,
  }).lean();
  if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
  if (consultation.Status !== 'scheduled') {
    return res.status(400).json({ error: 'Only scheduled consultations can be cancelled.' });
  }

  const noticeMs = CANCELLATION_NOTICE_HOURS * 60 * 60 * 1000;
  if (new Date(consultation.StartsAt).getTime() - Date.now() < noticeMs) {
    return res.status(400).json({
      error: `Consultations can be cancelled online up to ${CANCELLATION_NOTICE_HOURS} hours before they start. Contact us to make changes.`,
    });
  }

  const cancelled = await ConsultationModel.findOneAndUpdate(
    { _id: consultation._id, Status: 'scheduled' },
    { $set: { Status: 'cancelled', cancelledAt: new Date() } },
    { returnDocument: 'after' },
  ).lean();
  if (!cancelled) return res.status(400).json({ error: 'Only scheduled consultations can be cancelled.' });

  await releaseConsultationSlot(cancelled);
  const client = await UserModel.findById(req.user.id).select('FullName Email').lean();
  await notifyConsultationCancelled(cancelled, client, 'client');

  res.json({ consultation: extractClientConsultation(cancelled) });
});
