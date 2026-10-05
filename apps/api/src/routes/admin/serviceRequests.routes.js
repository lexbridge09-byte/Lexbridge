import { Router } from 'express';
import { z } from 'zod';
import { REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { STAFF_ROLES, STATUS_HISTORY_LIMIT, ServiceRequestModel, UserModel } from '../../models/index.js';
import { notifyRequestStatusChanged } from '../../services/index.js';
import { deriveContactSearchFilter, objectIdSchema, paginationSchema } from '../../utils.js';
import { CLIENT_DOCUMENT_FIELDS } from '../documents.routes.js';

const MAX_REQUEST_DOCUMENTS = 200;

const listQuerySchema = paginationSchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  category: z.enum(SERVICE_CATEGORY_KEYS).optional(),
  q: z.string().trim().max(100).optional(),
});

const updateSchema = z
  .object({
    Status: z.enum(REQUEST_STATUSES).optional(),
    Note: z.string().trim().max(1000).optional(),
    AssignedTo: objectIdSchema.nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

export const adminServiceRequestsRouter = Router();

adminServiceRequestsRouter.get('/', async (req, res) => {
  const { page, limit, status, category, q } = listQuerySchema.parse(req.query);
  const filter = {};
  if (status) filter.Status = status;
  if (category) filter.ServiceCategory = category;
  if (q) Object.assign(filter, deriveContactSearchFilter(q, { hasReferenceCode: true }));

  const [items, total] = await Promise.all([
    ServiceRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('AssignedTo', 'FullName Email')
      .lean(),
    ServiceRequestModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminServiceRequestsRouter.get('/:referenceCode', async (req, res) => {
  const request = await ServiceRequestModel.findOne({ ReferenceCode: req.params.referenceCode })
    .populate('AssignedTo', 'FullName Email')
    .lean();
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const documents = await DocumentModel.find({ RequestReference: request.ReferenceCode })
    .select(CLIENT_DOCUMENT_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_REQUEST_DOCUMENTS)
    .lean();
  res.json({ request, documents });
});

adminServiceRequestsRouter.patch('/:referenceCode', async (req, res) => {
  const input = updateSchema.parse(req.body);
  const request = await ServiceRequestModel.findOne({ ReferenceCode: req.params.referenceCode });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  let hasAssignmentChanged = false;
  if (input.AssignedTo !== undefined) {
    if (input.AssignedTo !== null) {
      const assignee = await UserModel.exists({ _id: input.AssignedTo, Role: { $in: STAFF_ROLES } });
      if (!assignee) return res.status(400).json({ error: 'Work can only be assigned to a LexBridge team member.' });
      if (String(request.AssignedTo ?? '') !== String(input.AssignedTo)) hasAssignmentChanged = true;
    } else if (request.AssignedTo) {
      hasAssignmentChanged = true;
    }
    request.AssignedTo = input.AssignedTo;
    request.AssignedBy = input.AssignedTo === null ? null : req.user.id;
    request.AssignedAt = input.AssignedTo === null ? null : new Date();
    // A fresh assignment moves early-stage requests to 'assigned'; reassignment never regresses progress
    if (hasAssignmentChanged && input.AssignedTo !== null && ['submitted', 'under-review'].includes(request.Status)) {
      request.Status = 'assigned';
    }
    // Unassigning returns the request to the review queue
    if (input.AssignedTo === null && request.Status === 'assigned') request.Status = 'under-review';
  }

  const hasStatusChanged = Boolean(input.Status) && input.Status !== request.Status;
  const note = input.Note ?? '';
  if (hasStatusChanged) request.Status = input.Status;
  if (hasStatusChanged || note || hasAssignmentChanged) {
    request.StatusHistory.push({ Status: request.Status, Note: note, changedAt: new Date() });
    const overflowCount = request.StatusHistory.length - STATUS_HISTORY_LIMIT;
    if (overflowCount > 0) request.StatusHistory.splice(0, overflowCount);
  }

  await request.save();
  await request.populate('AssignedTo', 'FullName Email');

  if (hasStatusChanged || note) await notifyRequestStatusChanged(request, note);
  res.json({ request });
});
