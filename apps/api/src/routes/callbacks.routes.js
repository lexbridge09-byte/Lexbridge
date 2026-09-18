import { Router } from 'express';
import { z } from 'zod';
import { CALLBACK_TIME_WINDOW_KEYS, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { CALLBACK_DEDUPE_MINUTES } from '../config/index.js';
import { attachUserIfPresent, createRateLimiter } from '../middleware/index.js';
import { CallbackRequestModel } from '../models/index.js';
import { notifyCallbackRequested } from '../services/index.js';
import { createWithUniqueReference, derivePhoneLast10 } from '../utils.js';

const CLIENT_CALLBACK_KEYS = ['ReferenceCode', 'Status', 'PreferredTime', 'PreferredLanguage', 'createdAt'];

const createCallbackLimiter = createRateLimiter({
  name: 'callbacks-create',
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: 'Too many callback requests. Please try again later.',
});

const createCallbackSchema = z.object({
  FullName: z.string().trim().min(2, 'Enter your name').max(120),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  PreferredLanguage: z.enum(SUPPORTED_LANGUAGE_KEYS).optional().default('en'),
  PreferredTime: z.enum(CALLBACK_TIME_WINDOW_KEYS).optional().default('now'),
  ServiceCategory: z.enum(SERVICE_CATEGORY_KEYS).optional().default('other'),
  Topic: z.string().trim().max(500).optional().default(''),
  ConsentGiven: z.literal(true, { error: 'Please accept the consent to continue' }),
});

function extractClientCallback(callback) {
  return Object.fromEntries(CLIENT_CALLBACK_KEYS.map((key) => [key, callback[key]]));
}

export const callbacksRouter = Router();

callbacksRouter.post('/', createCallbackLimiter, attachUserIfPresent, async (req, res) => {
  const input = createCallbackSchema.parse(req.body);

  // A second tap within the window returns the pending request instead of queueing another call
  const recentCallback = await CallbackRequestModel.findOne({
    PhoneLast10: derivePhoneLast10(input.Phone),
    Status: 'new',
    createdAt: { $gte: new Date(Date.now() - CALLBACK_DEDUPE_MINUTES * 60 * 1000) },
  }).lean();
  if (recentCallback) {
    return res.json({ callback: extractClientCallback(recentCallback), isDuplicate: true });
  }

  const now = new Date();
  const callback = await createWithUniqueReference('LK', (referenceCode) => CallbackRequestModel.create({
    ...input,
    ReferenceCode: referenceCode,
    Client: req.user?.id ?? null,
    Notes: [{ Status: 'new', changedAt: now }],
    consentedAt: now,
  }));

  await notifyCallbackRequested(callback);
  res.status(201).json({ callback: extractClientCallback(callback), isDuplicate: false });
});
