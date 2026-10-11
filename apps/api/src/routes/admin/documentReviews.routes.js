import { Router } from 'express';
import { z } from 'zod';
import { DOCUMENT_REVIEW_STATUSES } from '@lexbridge/shared';
import { DocumentReviewModel, STAFF_ROLES, UserModel } from '../../models/index.js';
import { objectIdSchema, paginationSchema } from '../../utils.js';
import { recordWorkAssignmentEvent } from '../../services/index.js';

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
  .select(`${ADMIN_REVIEW_LIST_FIELDS} AssignedTo AssignedAt`)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('Owner', 'FullName Email')
      .populate('AssignedTo', 'FullName Email Role')
      .lean(),
    DocumentReviewModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminDocumentReviewsRouter.patch('/:referenceCode', async (req, res) => {
  const input = z.object({ AssignedTo: objectIdSchema.nullable() }).parse(req.body ?? {});
  if (input.AssignedTo) {
    const assignee = await UserModel.exists({ _id: input.AssignedTo, Role: { $in: STAFF_ROLES } });
    if (!assignee) return res.status(400).json({ error: 'Choose an active lawyer, manager, or owner.' });
  }
  const previous = await DocumentReviewModel.findOne({ ReferenceCode: req.params.referenceCode }).select('AssignedTo').lean();
  const review = await DocumentReviewModel.findOneAndUpdate(
    { ReferenceCode: req.params.referenceCode },
    { $set: { AssignedTo: input.AssignedTo, AssignedAt: input.AssignedTo ? new Date() : null } },
    { returnDocument: 'after' },
  ).populate('AssignedTo', 'FullName Email Role').lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  await recordWorkAssignmentEvent({ workKind: 'document-review', referenceCode: review.ReferenceCode, actorId: req.user.id, previousAssignee: previous?.AssignedTo, newAssignee: review.AssignedTo });
  res.json({ review });
});

adminDocumentReviewsRouter.get('/:referenceCode', async (req, res) => {
  const review = await DocumentReviewModel.findOne({ ReferenceCode: req.params.referenceCode })
    .select('-StoredName -lockedUntil')
    .populate('Owner', 'FullName Email Phone')
    .lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});
