import { Router } from 'express';
import { z } from 'zod';
import { REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { DocumentModel, ServiceRequestModel } from '../../models/index.js';
import { applyRequestUpdate, notifyRequestStatusChanged, recordWorkAssignmentEvent } from '../../services/index.js';
import { deriveContactSearchFilter, objectIdSchema, paginationSchema } from '../../utils.js';
import { CLIENT_DOCUMENT_FIELDS } from '../documents.routes.js';

const MAX_REQUEST_DOCUMENTS = 200;
// List rows carry only a short description preview; the side sheet loads the full request
const DESCRIPTION_PREVIEW_LENGTH = 180;

const listQuerySchema = paginationSchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  category: z.enum(SERVICE_CATEGORY_KEYS).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});

const updateSchema = z
  .object({
    Status: z.enum(REQUEST_STATUSES).optional(),
    Note: z.string().trim().max(1000).optional(),
    AssignedTo: objectIdSchema.nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

export const adminServiceRequestsRouter = Router();

/*
  Queue list. One round trip returns the page, the total, a count per status (for the status tabs,
  computed on the same category/search filter so the tabs always add up) and a document count per row
  (one grouped query for the whole page, not one per row).
*/
adminServiceRequestsRouter.get('/', async (req, res) => {
  const { page, limit, status, category, q, sort } = listQuerySchema.parse(req.query);
  const baseFilter = {};
  if (category) baseFilter.ServiceCategory = category;
  if (q) Object.assign(baseFilter, deriveContactSearchFilter(q, { hasReferenceCode: true }));
  const filter = status ? { ...baseFilter, Status: status } : baseFilter;

  const [rows, total, statusGroups] = await Promise.all([
    ServiceRequestModel.find(filter)
      .select('ReferenceCode FullName Email Phone ServiceCategory Subtype Status AssignedTo Description Source createdAt updatedAt')
      .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('AssignedTo', 'FullName Email')
      .lean(),
    ServiceRequestModel.countDocuments(filter),
    ServiceRequestModel.aggregate([{ $match: baseFilter }, { $group: { _id: '$Status', count: { $sum: 1 } } }]),
  ]);

  const documentGroups = rows.length
    ? await DocumentModel.aggregate([
        { $match: { RequestReference: { $in: rows.map((row) => row.ReferenceCode) } } },
        { $group: { _id: '$RequestReference', count: { $sum: 1 } } },
      ])
    : [];
  const documentCounts = new Map(documentGroups.map((group) => [group._id, group.count]));
  const items = rows.map((row) => ({
    ...row,
    Description: row.Description?.length > DESCRIPTION_PREVIEW_LENGTH ? `${row.Description.slice(0, DESCRIPTION_PREVIEW_LENGTH)}…` : row.Description,
    DocumentCount: documentCounts.get(row.ReferenceCode) ?? 0,
  }));
  const statusCounts = Object.fromEntries(statusGroups.map((group) => [group._id, group.count]));
  res.json({ items, total, page, limit, statusCounts });
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

  const previousAssignee = request.AssignedTo;
  const result = await applyRequestUpdate(request, input, req.user);
  if (result.error) return res.status(result.error).json({ error: result.message });

  await request.save();
  await recordWorkAssignmentEvent({ workKind: 'service-request', referenceCode: request.ReferenceCode, actorId: req.user.id, previousAssignee, newAssignee: request.AssignedTo });
  await request.populate('AssignedTo', 'FullName Email');

  if (result.hasStatusChanged || result.note) await notifyRequestStatusChanged(request, result.note);
  res.json({ request });
});
