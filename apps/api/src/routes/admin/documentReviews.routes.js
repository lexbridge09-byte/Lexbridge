import { Router } from 'express';
import { z } from 'zod';
import { DOCUMENT_REVIEW_STATUSES } from '@lexbridge/shared';
import { DocumentReviewModel } from '../../models/index.js';
import { paginationSchema } from '../../utils.js';

const ADMIN_REVIEW_LIST_FIELDS = 'ReferenceCode Owner OriginalName SizeBytes PageCountEstimate Status RiskLevel FailureReason Attempts TokenUsage ServiceRequestReference createdAt completedAt';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(DOCUMENT_REVIEW_STATUSES).optional(),
});

export const adminDocumentReviewsRouter = Router();

adminDocumentReviewsRouter.get('/', async (req, res) => {
  const { page, limit, status } = listQuerySchema.parse(req.query);
  const filter = status ? { Status: status } : {};
  const [items, total] = await Promise.all([
    DocumentReviewModel.find(filter)
      .select(ADMIN_REVIEW_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('Owner', 'FullName Email')
      .lean(),
    DocumentReviewModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminDocumentReviewsRouter.get('/:referenceCode', async (req, res) => {
  const review = await DocumentReviewModel.findOne({ ReferenceCode: req.params.referenceCode })
    .select('-StoredName -lockedUntil')
    .populate('Owner', 'FullName Email Phone')
    .lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});
