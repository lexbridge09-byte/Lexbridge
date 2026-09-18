import { Router } from 'express';
import { z } from 'zod';
import { INTERNAL_REQUEST_SOURCES, REQUEST_SOURCES, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { isFeatureEnabled } from '../brand/index.js';
import { attachUserIfPresent, createRateLimiter, requireAuth, requireFeature } from '../middleware/index.js';
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

  const request = await createWithUniqueReference('LB', (referenceCode) => ServiceRequestModel.create({
    ...input,
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
serviceRequestsRouter.get('/mine', requireFeature('clientAccounts'), requireAuth, async (req, res) => {
  const requests = await ServiceRequestModel.find({
    $or: [{ Client: req.user.id }, { Email: req.user.email }],
  })
    .select(CLIENT_REQUEST_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_CLIENT_REQUESTS)
    .lean();
  res.json({ requests });
});

serviceRequestsRouter.get('/mine/:referenceCode', requireFeature('clientAccounts'), requireAuth, async (req, res) => {
  const request = await ServiceRequestModel.findOne({
    ReferenceCode: req.params.referenceCode,
    $or: [{ Client: req.user.id }, { Email: req.user.email }],
  })
    .select(CLIENT_REQUEST_FIELDS)
    .lean();
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ request });
});
