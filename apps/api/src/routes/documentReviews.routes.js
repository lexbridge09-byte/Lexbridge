import { Router } from 'express';
import { z } from 'zod';
import { SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { sanitizeIntakeDetails } from '@lexbridge/shared';
import { createRateLimiter, requireClient, uploadSingleDocument } from '../middleware/index.js';
import { DocumentReviewModel } from '../models/index.js';
import {
  CLIENT_REVIEW_FIELDS,
  CLIENT_REVIEW_LIST_FIELDS,
  createDocumentReview,
  getReviewAllowance,
  requestLawyerReview,
} from '../services/index.js';
import { createHttpError } from '../utils.js';

const MAX_CLIENT_REVIEWS = 100;

const uploadLimiter = createRateLimiter({
  name: 'document-reviews-upload',
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Too many uploads. Please try again later.',
});

const lawyerReviewSchema = z.object({
  FullName: z.string().trim().min(2).max(120).optional(),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number'),
  Notes: z.string().trim().max(2000).optional().default(''),
  PreferredLanguage: z.enum(SUPPORTED_LANGUAGE_KEYS).optional().default('en'),
  WhatsAppOptIn: z.boolean().optional().default(false),
  ConsentGiven: z.literal(true, { error: 'Please accept the consent to continue' }),
});

export const documentReviewsRouter = Router();

// Multipart fields arrive as strings; the client may send the details object as JSON
function parseMaybeJson(value) {
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

documentReviewsRouter.post('/', requireClient, uploadLimiter, uploadSingleDocument, async (req, res) => {
  if (!req.file) throw createHttpError(400, 'Choose a PDF to review.');
  // Optional intake answers about the document (document type, urgency, deadline)
  let intakeDetails = {};
  if (req.body?.IntakeSubtype) {
    const intake = sanitizeIntakeDetails(String(req.body.IntakeSubtype).slice(0, 80), parseMaybeJson(req.body.IntakeDetails));
    if (intake.ok) intakeDetails = intake.details;
  }
  const review = await createDocumentReview({ file: req.file, owner: req.user, intakeDetails });
  res.status(202).json({ review });
});

documentReviewsRouter.get('/mine', requireClient, async (req, res) => {
  const [reviews, allowance] = await Promise.all([
    DocumentReviewModel.find({ Owner: req.user.id })
      .select(CLIENT_REVIEW_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .limit(MAX_CLIENT_REVIEWS)
      .lean(),
    getReviewAllowance(req.user.id),
  ]);
  res.json({ reviews, allowance });
});

documentReviewsRouter.get('/mine/:referenceCode', requireClient, async (req, res) => {
  const review = await DocumentReviewModel.findOne({ ReferenceCode: req.params.referenceCode, Owner: req.user.id })
    .select(CLIENT_REVIEW_FIELDS)
    .lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});

documentReviewsRouter.post('/mine/:referenceCode/lawyer-review', requireClient, async (req, res) => {
  const input = lawyerReviewSchema.parse(req.body);
  const { review, isNew } = await requestLawyerReview({ referenceCode: req.params.referenceCode, user: req.user, input });
  res.status(isNew ? 201 : 200).json({ review, ServiceRequestReference: review.ServiceRequestReference });
});
