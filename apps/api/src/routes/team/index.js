import { Router } from 'express';
import { z } from 'zod';
import { CALLBACK_STATUSES, DOCUMENT_REVIEW_STATUSES, LAWYER_ALLOWED_STATUSES, REQUEST_STATUSES, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { createRateLimiter, requireTeamMember, uploadSingleDocument } from '../../middleware/index.js';
import { CallbackRequestModel, ConsultationModel, DocumentModel, DocumentReviewModel, FollowUpModel, OrderModel, STAFF_ROLES, STATUS_HISTORY_LIMIT, ServiceRequestModel, UserModel, WorkAssignmentEventModel } from '../../models/index.js';
import { applyRequestUpdate, notifyDeliverableReady, notifyRequestStatusChanged, recordWorkAssignmentEvent } from '../../services/index.js';
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
const TEAM_CONSULTATION_FIELDS = 'ReferenceCode Client ConsultationType Mode StartsAt DurationMinutes Description IntakeCategory IntakeSubtype IntakeDetails Status MeetingLink AdminNote AssignedTo createdAt updatedAt';

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
const followUpCreateSchema = z.object({
  WorkKind: z.string().trim().min(1).max(40),
  WorkReferenceCode: z.string().trim().min(1).max(80),
  Title: z.string().trim().min(1).max(160),
  Notes: z.string().trim().max(2000).optional().default(''),
  NextAction: z.string().trim().max(1000).optional().default(''),
  DueAt: z.coerce.date(),
  Priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  AssignedTo: z.string().regex(/^[a-f\d]{24}$/i).nullable().optional(),
});

const deskUploadLimiter = createRateLimiter({
  name: 'team-desk-upload',
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: 'Too many uploads. Please try again later.',
});

export const teamRouter = Router();

teamRouter.use(requireTeamMember);

// A stable, work-type-neutral inbox. Keep the source-specific endpoints below for compatibility.
teamRouter.get('/assignments', async (req, res) => {
  const [requests, consultations, callbacks, reviews, orders, followUps] = await Promise.all([
    ServiceRequestModel.find({ AssignedTo: req.user.id })
      .select(TEAM_REQUEST_FIELDS)
      .sort({ updatedAt: -1 })
      .limit(MAX_TEAM_REQUESTS)
      .lean(),
    ConsultationModel.find({ AssignedTo: req.user.id })
      .select(TEAM_CONSULTATION_FIELDS)
      .sort({ StartsAt: 1 })
      .limit(MAX_TEAM_REQUESTS)
      .lean(),
    CallbackRequestModel.find({ AssignedTo: req.user.id }).select('ReferenceCode FullName ServiceCategory Topic Status AssignedTo AssignedAt createdAt updatedAt').sort({ createdAt: -1 }).limit(MAX_TEAM_REQUESTS).lean(),
    DocumentReviewModel.find({ AssignedTo: req.user.id }).select('ReferenceCode Owner OriginalName Status RiskLevel AssignedTo AssignedAt createdAt updatedAt').populate('Owner', 'FullName Email').sort({ createdAt: -1 }).limit(MAX_TEAM_REQUESTS).lean(),
    OrderModel.find({ AssignedTo: req.user.id }).select('ReferenceCode FullName Items Status AssignedTo AssignedAt createdAt updatedAt').sort({ createdAt: -1 }).limit(MAX_TEAM_REQUESTS).lean(),
    FollowUpModel.find({ AssignedTo: req.user.id, Status: 'open' }).sort({ DueAt: 1 }).limit(MAX_TEAM_REQUESTS).lean(),
  ]);

  const items = [
    ...requests.map((request) => ({
      kind: 'service-request',
      referenceCode: request.ReferenceCode,
      title: request.Subtype || request.ServiceCategory,
      clientName: request.FullName,
      status: request.Status,
      assignedAt: request.updatedAt,
      createdAt: request.createdAt,
      href: `/team/requests/${request.ReferenceCode}`,
      source: request,
    })),
    ...consultations.map((consultation) => ({
      kind: 'consultation',
      referenceCode: consultation.ReferenceCode,
      title: consultation.IntakeSubtype || consultation.ConsultationType,
      clientName: '',
      status: consultation.Status,
      startsAt: consultation.StartsAt,
      assignedAt: consultation.updatedAt,
      createdAt: consultation.createdAt,
      href: `/team/consultations/${consultation.ReferenceCode}`,
      source: consultation,
    })),
    ...callbacks.map((callback) => ({ kind: 'callback', referenceCode: callback.ReferenceCode, title: callback.Topic || 'Callback request', clientName: callback.FullName, category: callback.ServiceCategory, status: callback.Status, assignedAt: callback.AssignedAt, createdAt: callback.createdAt, href: `/team/callbacks/${callback.ReferenceCode}`, source: callback })),
    ...reviews.map((review) => ({ kind: 'document-review', referenceCode: review.ReferenceCode, title: review.OriginalName, clientName: review.Owner?.FullName || '', status: review.Status, assignedAt: review.AssignedAt, createdAt: review.createdAt, href: `/team/document-reviews/${review.ReferenceCode}`, source: review })),
    ...orders.map((order) => ({ kind: 'order', referenceCode: order.ReferenceCode, title: order.Items?.[0]?.TitleSnapshot || 'Order', clientName: order.FullName, status: order.Status, assignedAt: order.AssignedAt, createdAt: order.createdAt, href: `/team/orders/${order.ReferenceCode}`, source: order })),
    ...followUps.map((followUp) => ({ kind: 'follow-up', referenceCode: followUp.ReferenceCode, title: followUp.Title, clientName: '', status: followUp.Status, dueAt: followUp.DueAt, assignedAt: followUp.AssignedAt, createdAt: followUp.createdAt, href: `/team/follow-ups/${followUp.ReferenceCode}`, source: followUp })),
  ].sort((leftItem, rightItem) => new Date(leftItem.startsAt || leftItem.createdAt) - new Date(rightItem.startsAt || rightItem.createdAt));

  res.json({ items });
});

teamRouter.get('/assignments/:workKind/:referenceCode/events', async (req, res) => {
  const canSee = await Promise.any([
    ServiceRequestModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
    ConsultationModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
    CallbackRequestModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
    DocumentReviewModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
    OrderModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
    FollowUpModel.exists({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }),
  ]).catch(() => false);
  if (!canSee) return res.status(404).json({ error: 'Assignment not found' });
  const events = await WorkAssignmentEventModel.find({ WorkKind: req.params.workKind, ReferenceCode: req.params.referenceCode }).sort({ createdAt: -1 }).populate('Actor PreviousAssignee NewAssignee', 'FullName Email Role').lean();
  res.json({ events });
});

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

teamRouter.get('/consultations/:referenceCode', async (req, res) => {
  const consultation = await ConsultationModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id })
    .select(TEAM_CONSULTATION_FIELDS)
    .populate('Client', 'FullName Email Phone')
    .lean();
  if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
  res.json({ consultation });
});

teamRouter.get('/callbacks', async (req, res) => {
  const callbacks = await CallbackRequestModel.find({ AssignedTo: req.user.id }).sort({ createdAt: -1 }).limit(MAX_TEAM_REQUESTS).lean();
  res.json({ callbacks });
});

teamRouter.get('/callbacks/:referenceCode', async (req, res) => {
  const callback = await CallbackRequestModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }).populate('AssignedTo', 'FullName Email Role').lean();
  if (!callback) return res.status(404).json({ error: 'Callback request not found' });
  res.json({ callback });
});

teamRouter.patch('/callbacks/:referenceCode', async (req, res) => {
  const input = z.object({ Status: z.enum(CALLBACK_STATUSES), Note: z.string().trim().max(1000).optional() }).parse(req.body ?? {});
  const callback = await CallbackRequestModel.findOneAndUpdate({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }, { $set: { Status: input.Status }, $push: { Notes: { Status: input.Status, Note: input.Note || '', ChangedBy: req.user.id, changedAt: new Date() } } }, { returnDocument: 'after' }).lean();
  if (!callback) return res.status(404).json({ error: 'Callback request not found' });
  res.json({ callback });
});

teamRouter.get('/document-reviews', async (req, res) => {
  const reviews = await DocumentReviewModel.find({ AssignedTo: req.user.id }).populate('Owner', 'FullName Email Phone').sort({ createdAt: -1 }).limit(MAX_TEAM_REQUESTS).lean();
  res.json({ reviews });
});

teamRouter.get('/document-reviews/:referenceCode', async (req, res) => {
  const review = await DocumentReviewModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }).select('-StoredName -lockedUntil').populate('Owner', 'FullName Email Phone').lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});

teamRouter.get('/orders/:referenceCode', async (req, res) => {
  const order = await OrderModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id })
    .select('ReferenceCode FullName Email Phone Items Status Description ServiceRequestReference paidAt AssignedTo AssignedAt createdAt updatedAt')
    .lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

teamRouter.get('/follow-ups/:referenceCode', async (req, res) => {
  const followUp = await FollowUpModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }).lean();
  if (!followUp) return res.status(404).json({ error: 'Follow-up not found' });
  res.json({ followUp });
});

teamRouter.post('/follow-ups', requireManagerMember, async (req, res) => {
  const input = followUpCreateSchema.parse(req.body ?? {});
  const assignedTo = input.AssignedTo ?? req.user.id;
  if (!(await UserModel.exists({ _id: assignedTo, Role: { $in: STAFF_ROLES } }))) return res.status(400).json({ error: 'Choose an active staff member.' });
  const referenceCode = `FU-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const followUp = await FollowUpModel.create({ ...input, ReferenceCode: referenceCode, AssignedTo: assignedTo, AssignedBy: req.user.id, AssignedAt: new Date() });
  res.status(201).json({ followUp });
});

teamRouter.patch('/follow-ups/:referenceCode', async (req, res) => {
  const input = z.object({ Status: z.enum(['open', 'completed', 'cancelled']) }).parse(req.body ?? {});
  const followUp = await FollowUpModel.findOne({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id });
  if (!followUp) return res.status(404).json({ error: 'Follow-up not found' });
  followUp.Status = input.Status;
  followUp.completedAt = input.Status === 'completed' ? new Date() : null;
  await followUp.save();
  res.json({ followUp });
});

teamRouter.patch('/document-reviews/:referenceCode', async (req, res) => {
  const input = z.object({ Status: z.enum(DOCUMENT_REVIEW_STATUSES) }).parse(req.body ?? {});
  const review = await DocumentReviewModel.findOneAndUpdate({ ReferenceCode: req.params.referenceCode, AssignedTo: req.user.id }, { $set: { Status: input.Status } }, { returnDocument: 'after' }).lean();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
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

function requireManagerMember(req, res, next) {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Only the 2nd owner manages the team desk.' });
  }
  next();
}

teamRouter.get('/lawyers', requireManagerMember, async (req, res) => {
  const items = await UserModel.find({ Role: { $in: STAFF_ROLES } })
    .select('FullName Email Role createdAt')
    .sort({ createdAt: -1 })
    .limit(MAX_DESK_PAGE)
    .lean();
  res.json({ items });
});

teamRouter.patch('/desk/consultations/:referenceCode', requireManagerMember, async (req, res) => {
  const input = z.object({ AssignedTo: z.string().regex(/^[a-f\d]{24}$/i).nullable() }).parse(req.body ?? {});
  if (input.AssignedTo && !(await UserModel.exists({ _id: input.AssignedTo, Role: { $in: STAFF_ROLES } }))) return res.status(400).json({ error: 'Choose an active staff member.' });
  const consultation = await ConsultationModel.findOne({ ReferenceCode: req.params.referenceCode });
  if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
  const previousAssignee = consultation.AssignedTo;
  consultation.AssignedTo = input.AssignedTo;
  await consultation.save();
  await recordWorkAssignmentEvent({ workKind: 'consultation', referenceCode: consultation.ReferenceCode, actorId: req.user.id, previousAssignee, newAssignee: consultation.AssignedTo });
  await consultation.populate('AssignedTo', 'FullName Email Role');
  res.json({ consultation });
});

teamRouter.patch('/desk/orders/:referenceCode', requireManagerMember, async (req, res) => {
  const input = z.object({ AssignedTo: z.string().regex(/^[a-f\d]{24}$/i).nullable() }).parse(req.body ?? {});
  if (input.AssignedTo && !(await UserModel.exists({ _id: input.AssignedTo, Role: { $in: STAFF_ROLES } }))) return res.status(400).json({ error: 'Choose an active staff member.' });
  const order = await OrderModel.findOne({ ReferenceCode: req.params.referenceCode });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const previousAssignee = order.AssignedTo;
  order.AssignedTo = input.AssignedTo;
  order.AssignedBy = input.AssignedTo ? req.user.id : null;
  order.AssignedAt = input.AssignedTo ? new Date() : null;
  await order.save();
  await recordWorkAssignmentEvent({ workKind: 'order', referenceCode: order.ReferenceCode, actorId: req.user.id, previousAssignee, newAssignee: order.AssignedTo });
  await order.populate('AssignedTo', 'FullName Email Role');
  res.json({ order });
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

  const previousAssignee = request.AssignedTo;
  const result = await applyRequestUpdate(request, input, req.user);
  if (result.error) return res.status(result.error).json({ error: result.message });

  await request.save();
  await recordWorkAssignmentEvent({ workKind: 'service-request', referenceCode: request.ReferenceCode, actorId: req.user.id, previousAssignee, newAssignee: request.AssignedTo });
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
