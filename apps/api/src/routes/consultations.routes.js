import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { CANCELLATION_NOTICE_HOURS, CONSULTATION_MODE_KEYS, CONSULTATION_TYPE_KEYS, getIntakeFields, sanitizeIntakeDetails, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { createRateLimiter, requireClient } from '../middleware/index.js';
import { AvailabilityModel, ConsultationModel, SlotModel, UserModel } from '../models/index.js';
import { CALENDLY_TOKEN } from '../config/index.js';
import {
  CLIENT_CONSULTATION_FIELDS,
  claimSlotSeat,
  releaseSlotSeat,
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
  IntakeCategory: z.enum(SERVICE_CATEGORY_KEYS).optional(),
  IntakeSubtype: z.string().trim().max(80).optional().default(''),
  IntakeDetails: z.record(z.string(), z.string().max(300)).optional().default({}),
});

export const consultationsRouter = Router();

const CALENDLY_API_PREFIX = 'https://api.calendly.com/';
const calendlyBookingSchema = bookingSchema.omit({ SlotId: true }).extend({
  EventUri: z.string().startsWith(`${CALENDLY_API_PREFIX}scheduled_events/`).max(300),
  InviteeUri: z.string().startsWith(`${CALENDLY_API_PREFIX}scheduled_events/`).max(400),
});

async function loadCalendlyResource(uri) {
  const response = await fetch(uri, { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` } });
  if (!response.ok) return null;
  return (await response.json()).resource ?? null;
}

// Which booking flow the consultation page shows (built-in slots or the Calendly widget)
consultationsRouter.get('/booking-provider', async (req, res) => {
  const availability = await AvailabilityModel.findOne({ Key: 'default' }).select('Provider CalendlyUrl').lean();
  const isCalendly = availability?.Provider === 'calendly' && Boolean(availability.CalendlyUrl);
  res.json({ provider: isCalendly ? 'calendly' : 'builtin', calendlyUrl: isCalendly ? availability.CalendlyUrl : '' });
});

/*
  Records a booking made in the embedded Calendly widget. The browser only reports Calendly's event and
  invitee URIs; the time, status and invitee are read from the Calendly API with our token, so a client
  can't forge a booking. Each invitee URI is recorded once (unique index).
*/
consultationsRouter.post('/calendly', requireClient, bookingLimiter, async (req, res) => {
  if (!CALENDLY_TOKEN) return res.status(503).json({ error: 'Calendly booking is not configured yet.' });
  const input = calendlyBookingSchema.parse(req.body);
  const [event, invitee] = await Promise.all([loadCalendlyResource(input.EventUri), loadCalendlyResource(input.InviteeUri)]);
  if (!event || !invitee || invitee.event !== input.EventUri || event.status !== 'active' || invitee.status !== 'active') {
    return res.status(400).json({ error: 'We could not confirm that Calendly booking. Please try again.' });
  }
  const startsAt = new Date(event.start_time);
  const durationMinutes = Math.max(10, Math.round((new Date(event.end_time) - startsAt) / 60000));
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
    return res.status(400).json({ error: 'That Calendly booking is in the past.' });
  }

  const existing = await ConsultationModel.findOne({ CalendlyInviteeUri: input.InviteeUri }).lean();
  if (existing) return res.status(200).json({ consultation: extractClientConsultation(existing) });

  const intakeSubtype = input.IntakeSubtype && getIntakeFields(input.IntakeSubtype) ? input.IntakeSubtype : '';
  const intake = intakeSubtype ? sanitizeIntakeDetails(intakeSubtype, input.IntakeDetails) : { ok: true, details: {} };
  if (!intake.ok) return res.status(400).json({ error: 'Some required topic details are missing.', details: intake.missing });

  const now = new Date();
  const consultation = await createWithUniqueReference('LC', (referenceCode) => ConsultationModel.create({
    ReferenceCode: referenceCode,
    Client: req.user.id,
    CalendlyEventUri: input.EventUri,
    CalendlyInviteeUri: input.InviteeUri,
    ConsultationType: input.ConsultationType,
    Mode: input.Mode,
    StartsAt: startsAt,
    DurationMinutes: durationMinutes,
    Phone: input.Phone,
    Description: input.Description,
    IntakeCategory: input.IntakeCategory ?? '',
    IntakeSubtype: intakeSubtype,
    IntakeDetails: intake.details,
    WhatsAppOptIn: input.WhatsAppOptIn,
    PreferredLanguage: input.PreferredLanguage,
    ConsentGiven: true,
    consentedAt: now,
  }));

  const client = await UserModel.findById(req.user.id).select('FullName Email Phone').lean();
  await notifyConsultationBooked(consultation, client);
  res.status(201).json({ consultation: extractClientConsultation(consultation) });
});

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

consultationsRouter.post('/', requireClient, bookingLimiter, async (req, res) => {
  const input = bookingSchema.parse(req.body);
  const now = new Date();
  // Topic intake: only consult a subtype that exists, then whitelist its answers
  const intakeSubtype = input.IntakeSubtype && getIntakeFields(input.IntakeSubtype) ? input.IntakeSubtype : '';
  const intake = intakeSubtype ? sanitizeIntakeDetails(intakeSubtype, input.IntakeDetails) : { ok: true, details: {} };
  if (!intake.ok) {
    return res.status(400).json({ error: 'Some required topic details are missing.', details: intake.missing });
  }
  const consultationId = new mongoose.Types.ObjectId();

  // Atomic seat claim: a time takes as many clients as lawyers are available, never more
  const slot = await claimSlotSeat(input.SlotId, consultationId, now);
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
      IntakeCategory: input.IntakeCategory ?? '',
      IntakeSubtype: intakeSubtype,
      IntakeDetails: intake.details,
      WhatsAppOptIn: input.WhatsAppOptIn,
      PreferredLanguage: input.PreferredLanguage,
      ConsentGiven: true,
      consentedAt: now,
    }));
  } catch (err) {
    await releaseSlotSeat(slot._id, consultationId);
    throw err;
  }

  const client = await UserModel.findById(req.user.id).select('FullName Email Phone').lean();
  if (client && !client.Phone) {
    await UserModel.updateOne({ _id: client._id, Phone: '' }, { $set: { Phone: input.Phone } });
  }

  await notifyConsultationBooked(consultation, client);
  res.status(201).json({ consultation: extractClientConsultation(consultation) });
});

consultationsRouter.get('/mine', requireClient, async (req, res) => {
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

consultationsRouter.post('/mine/:referenceCode/cancel', requireClient, async (req, res) => {
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
