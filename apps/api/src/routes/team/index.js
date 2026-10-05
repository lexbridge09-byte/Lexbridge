import { Router } from 'express';
import { z } from 'zod';
import { LAWYER_ALLOWED_STATUSES, REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { createRateLimiter, requireTeamMember, uploadSingleDocument } from '../../middleware/index.js';
import { DocumentModel, STAFF_ROLES, STATUS_HISTORY_LIMIT, ServiceRequestModel, UserModel } from '../../models/index.js';
import { applyRequestUpdate, notifyDeliverableReady, notifyRequestStatusChanged } from '../../services/index.js';
import { createHttpError, deriveContactSearchFilter, paginationSchema } from '../../utils.js';
import { CLIENT_DOCUMENT_FIELDS, createDocumentRecord } from '../documents.routes.js';
import { findOrCreateRequestOwner } from '../admin/documents.routes.js';

/*
  The team workspace, gated to lawyer + manager (the main owner gets 404 here — their desk is /admin).

  - /requests/*        the assigned-work view: every team member sees only work assigned to them,
                       and losing an assignment revokes access immediately.
  - /desk/*            manager-only: the whole requests desk — list, detail, assignment, deliverables.
  - /lawyers           manager-only: active lawyers for the assign picker and onboarding panel.
*/

const MAX_TEAM_REQUESTS = 200;
const MAX_REQUEST_DOCUMENTS = 200;
const MAX_DESK_PAGE = 100;

const TEAM_REQUEST_FIELDS = 'ReferenceCode ServiceCategory Subtype IntakeDetails Description Status StatusHistory FullName Email Phone AssignedTo createdAt updatedAt';

const statusUpdateSchema = z.object({
  Status: z.enum(REQUEST_STATUSES),
  Note: z.string().trim().max(1000).optional().default(''),
});

const deskListQuerySchema = paginationSchema.extend({
  status: z.enum(REQUEST_STATUSES).optional(),
  category: z.enum(SERVICE_CATEGORY_KEYS).optional(),
  q: z.string().trim().max(100).optional(),
});

const deskUpdateSchema = z
  .object({
    Status: z.enum(REQUEST_STATUSES).optional(),
    Note: z.string().trim().max(1000).optional(),
    AssignedTo: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

const deskUploadLimiter = createRateLimiter({
  name: 'team-desk-upload',
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: 'Too many uploads. Please try again later.',
});

export const teamRouter = Router();

teamRouter.use(requireTeamMember);

async function findAssignedRequest(referenceCode, userId) {
  return ServiceRequestModel.findOne({ ReferenceCode: referenceCode, AssignedTo: userId })
    .select(TEAM_REQUEST_FIELDS)
    .lean();
}

// ---------- Assigned work (every team member) ----------

teamRouter.get('/requests', async (req, res) => {
  const requests = await ServiceRequestModel.find({ AssignedTo: req.user.id })
    .select(TEAM_REQUEST_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_TEAM_REQUESTS)
    .lean();
  res.json({ requests });
});

teamRouter.get('/requests/:referenceCode', async (req, res) => {
  const request = await findAssignedRequest(req.params.referenceCode, req.user.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const documents = await DocumentModel.find({ RequestReference: request.ReferenceCode })
    .select(CLIENT_DOCUMENT_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_REQUEST_DOCUMENTS)
    .lean();
  res.json({ request, documents });
});

// Status updates from the assigned lawyer; manager/owner keep full control from their desks
teamRouter.patch('/requests/:referenceCode/status', async (req, res) => {
  const input = statusUpdateSchema.parse(req.body ?? {});
  const request = await ServiceRequestModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id });
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (!LAWYER_ALLOWED_STATUSES.includes(input.Status)) {
    return res.status(400).json({ error: 'This status can only be set by the manager or owner.' });
  }

  const hasStatusChanged = input.Status !== request.Status;
  if (!hasStatusChanged && !input.Note) return res.json({ request: request.toObject() });

  if (hasStatusChanged) request.Status = input.Status;
  request.StatusHistory.push({ Status: request.Status, Note: input.Note, changedAt: new Date() });
  const overflowCount = request.StatusHistory.length - STATUS_HISTORY_LIMIT;
  if (overflowCount > 0) request.StatusHistory.splice(0, overflowCount);
  await request.save();

  if (hasStatusChanged || input.Note) await notifyRequestStatusChanged(request, input.Note);
  res.json({ request: request.toObject() });
});

// The finished work goes back to the client: uploaded here, visible and downloadable in their dashboard.
// Lawyers must be assigned to the request; a 2nd owner may deliver work they did themselves.
teamRouter.post('/requests/:referenceCode/deliverable', uploadSingleDocument, async (req, res) => {
  if (!req.file) throw createHttpError(400, 'Choose a file to upload.');
  const isLawyer = req.user.role === 'lawyer';
  const scope = isLawyer ? { ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id } : { ReferenceCode: req.params.referenceCode };
  const request = await ServiceRequestModel.findOne(scope)
    .select('ReferenceCode Client Email FullName Phone WhatsAppOptIn Status StatusHistory');
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const ownerId = request.Client ?? (await findOrCreateRequestOwner(request.ReferenceCode));
  if (!ownerId) throw createHttpError(400, 'This request has no client account yet, so the deliverable cannot be attached to it.');

  const document = await createDocumentRecord({
    file: req.file,
    ownerId,
    requestReference: request.ReferenceCode,
    uploadedByRole: req.user.role,
    uploadedById: req.user.id,
    kind: 'deliverable',
  });

  // Delivering the work completes the request unless it is already closed
  if (['assigned', 'in-progress', 'awaiting-client', 'under-review', 'submitted'].includes(request.Status)) {
    request.Status = 'completed';
    request.StatusHistory.push({ Status: 'completed', Note: 'Deliverable uploaded', changedAt: new Date() });
    const overflowCount = request.StatusHistory.length - STATUS_HISTORY_LIMIT;
    if (overflowCount > 0) request.StatusHistory.splice(0, overflowCount);
    await request.save();
  }

  await notifyDeliverableReady(request, document.OriginalName);
  res.status(201).json({ document: { _id: document._id, OriginalName: document.OriginalName, Kind: document.Kind } });
});

// ---------- Team desk (manager only) ----------

const requireManagerMember = (req, res, next) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Only the 2nd owner manages the team desk.' });
  }
  next();
};

teamRouter.get('/lawyers', requireManagerMember, async (req, res) => {
  const items = await UserModel.find({ Role: 'lawyer' })
    .select('FullName Email Role createdAt')
    .sort({ createdAt: -1 })
    .limit(MAX_DESK_PAGE)
    .lean();
  res.json({ items });
});

teamRouter.get('/desk/requests', requireManagerMember, async (req, res) => {
  const { page, limit, status, category, q } = deskListQuerySchema.parse(req.query);
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

teamRouter.get('/desk/requests/:referenceCode', requireManagerMember, async (req, res) => {
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

// Assignment and full status control — the manager's version of the admin PATCH
teamRouter.patch('/desk/requests/:referenceCode', requireManagerMember, async (req, res) => {
  const input = deskUpdateSchema.parse(req.body ?? {});
  const request = await ServiceRequestModel.findOne({ ReferenceCode: req.params.referenceCode });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const result = await applyRequestUpdate(request, input, req.user);
  if (result.error) return res.status(result.error).json({ error: result.message });

  await request.save();
  await request.populate('AssignedTo', 'FullName Email');

  if (result.hasStatusChanged || result.note) await notifyRequestStatusChanged(request, result.note);
  res.json({ request });
});

// A 2nd owner delivering work they did themselves
teamRouter.post('/desk/requests/:referenceCode/deliverable', requireManagerMember, deskUploadLimiter, uploadSingleDocument, async (req, res) => {
  if (!req.file) throw createHttpError(400, 'Choose a file to upload.');
  const request = await ServiceRequestModel.findOne({ ReferenceCode: req.params.referenceCode })
    .select('ReferenceCode Client Email FullName Phone WhatsAppOptIn Status StatusHistory');
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const ownerId = request.Client ?? (await findOrCreateRequestOwner(request.ReferenceCode));
  if (!ownerId) throw createHttpError(400, 'This request has no client account yet, so the deliverable cannot be attached to it.');

  const document = await createDocumentRecord({
    file: req.file,
    ownerId,
    requestReference: request.ReferenceCode,
    uploadedByRole: req.user.role,
    uploadedById: req.user.id,
    kind: 'deliverable',
  });

  if (['assigned', 'in-progress', 'awaiting-client', 'under-review', 'submitted'].includes(request.Status)) {
    request.Status = 'completed';
    request.StatusHistory.push({ Status: 'completed', Note: 'Deliverable uploaded', changedAt: new Date() });
    const overflowCount = request.StatusHistory.length - STATUS_HISTORY_LIMIT;
    if (overflowCount > 0) request.StatusHistory.splice(0, overflowCount);
    await request.save();
  }

  await notifyDeliverableReady(request, document.OriginalName);
  res.status(201).json({ document: { _id: document._id, OriginalName: document.OriginalName, Kind: document.Kind } });
});
