import { Router } from 'express';
import { z } from 'zod';
import { INTERNAL_REQUEST_SOURCES, REQUEST_SOURCES, sanitizeIntakeDetails, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { isFeatureEnabled } from '../brand/index.js';
import { attachUserIfPresent, createRateLimiter, requireAuth, requireClient, requireFeature } from '../middleware/index.js';
import { ServiceRequestModel } from '../models/index.js';
import { notifyRequestReceived } from '../services/index.js';
import { createWithUniqueReference } from '../utils.js';

// Upper bound on what a client list returns in one response
const MAX_CLIENT_REQUESTS = 200;

const PUBLIC_REQUEST_SOURCES = REQUEST_SOURCES.filter((source) => !INTERNAL_REQUEST_SOURCES.includes(source));

const createRequestLimiter = createRateLimiter({
  name: 'service-requests-create',
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many requests submitted. Please try again later.',
});

const createRequestSchema = z.object({
  FullName: z.string().trim().min(2, 'Enter your full name').max(120),
  Email: z.email('Enter a valid email address').max(254),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  ServiceCategory: z.enum(SERVICE_CATEGORY_KEYS),
  Subtype: z.string().trim().max(120).optional().default(''),
  IntakeDetails: z.record(z.string(), z.string().max(300)).optional().default({}),
  Description: z.string().trim().min(20, 'Please describe your requirement in a little more detail').max(5000),
  Source: z.enum(PUBLIC_REQUEST_SOURCES).default('contact-form'),
  ConsentGiven: z.literal(true, { error: 'Please accept the consent to continue' }),
  WhatsAppOptIn: z.boolean().optional().default(false),
  PreferredLanguage: z.enum(SUPPORTED_LANGUAGE_KEYS).optional().default('en'),
});

// Only the fields a client is allowed to see about their own request
const CLIENT_REQUEST_FIELDS = 'ReferenceCode ServiceCategory Subtype Description Status StatusHistory createdAt updatedAt';

export const serviceRequestsRouter = Router();

serviceRequestsRouter.post('/', createRequestLimiter, attachUserIfPresent, async (req, res) => {
  const input = createRequestSchema.parse(req.body);
  if (input.Source === 'drafting-form' && !isFeatureEnabled('legalDrafting')) {
    return res.status(404).json({ error: 'This feature is not available.' });
  }
  const now = new Date();
  // Subtype-specific answers: whitelist against the intake catalog, require its mandatory fields
  const intake = sanitizeIntakeDetails(input.Subtype, input.IntakeDetails);
  if (!intake.ok) {
    return res.status(400).json({ error: 'Some required details are missing for the selected matter type.', details: intake.missing });
  }

  const request = await createWithUniqueReference('LB', (referenceCode) => ServiceRequestModel.create({
    ...input,
    IntakeDetails: intake.details,
    Email: input.Email.toLowerCase(),
    ReferenceCode: referenceCode,
    Client: req.user?.id ?? null,
    StatusHistory: [{ Status: 'submitted', changedAt: now }],
    consentedAt: now,
  }));

  await notifyRequestReceived(request);
  res.status(201).json({ ReferenceCode: request.ReferenceCode });
});

// Email is verified by OTP at sign-in, so requests submitted with it before sign-up are included
serviceRequestsRouter.get('/mine', requireFeature('clientAccounts'), requireClient, async (req, res) => {
  const requests = await ServiceRequestModel.find({
    $or: [{ Client: req.user.id }, { Email: req.user.email }],
  })
    .select(CLIENT_REQUEST_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_CLIENT_REQUESTS)
    .lean();
  res.json({ requests });
});

serviceRequestsRouter.get('/mine/:referenceCode', requireFeature('clientAccounts'), requireClient, async (req, res) => {
  const request = await ServiceRequestModel.findOne({
    ReferenceCode: req.params.referenceCode,
    $or: [{ Client: req.user.id }, { Email: req.user.email }],
  })
    .select(CLIENT_REQUEST_FIELDS)
    .lean();
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ request });
});

// Guest submissions arrive without an account. After signing in (with the same email),
// the reference code from the confirmation screen links the request to the dashboard.
const linkSchema = z.object({
  ReferenceCode: z.string().trim().min(3, 'Enter the reference code').max(40),
});

serviceRequestsRouter.post('/link', requireFeature('clientAccounts'), requireClient, async (req, res) => {
  const { ReferenceCode } = linkSchema.parse(req.body ?? {});
  const referenceCode = ReferenceCode.toUpperCase();

  // Atomic claim: only an unclaimed request carrying the user's email (or no email at all) can be linked
  const linked = await ServiceRequestModel.findOneAndUpdate(
    { ReferenceCode: referenceCode, Client: null, $or: [{ Email: req.user.email }, { Email: '' }] },
    { $set: { Client: req.user.id } },
    { returnDocument: 'after', projection: CLIENT_REQUEST_FIELDS },
  );
  if (linked) return res.json({ request: linked, linked: true });

  const request = await ServiceRequestModel.findOne({ ReferenceCode: referenceCode }).select('Client Email').lean();
  if (!request) return res.status(404).json({ error: 'No request carries that reference. Check the code from your confirmation screen.' });
  if (String(request.Client ?? '') === req.user.id) {
    return res.json({ linked: true, alreadyLinked: true });
  }
  return res.status(403).json({
    error: request.Email && request.Email !== req.user.email
      ? 'This reference was submitted with a different email. Sign in with that email instead.'
      : 'This reference is already linked to another account.',
  });
});
