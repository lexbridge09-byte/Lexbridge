import { Router } from 'express';
import { z } from 'zod';
import { LAWYER_ALLOWED_STATUSES, REQUEST_STATUSES } from '@lexbridge/shared';
import { requireStaff, uploadSingleDocument } from '../../middleware/index.js';
import { STATUS_HISTORY_LIMIT, DocumentModel, ServiceRequestModel } from '../../models/index.js';
import { notifyDeliverableReady, notifyRequestStatusChanged } from '../../services/index.js';
import { createHttpError } from '../../utils.js';
import { CLIENT_DOCUMENT_FIELDS, createDocumentRecord } from '../documents.routes.js';
import { findOrCreateRequestOwner } from '../admin/documents.routes.js';

/*
  The team workspace: lawyers (and, where noted, manager/owner) work on the requests assigned to
  them. Everything here is scoped by AssignedTo, so a lawyer only ever sees their own work and
  losing an assignment revokes access immediately.
*/

const MAX_TEAM_REQUESTS = 200;
const MAX_REQUEST_DOCUMENTS = 200;

const TEAM_REQUEST_FIELDS = 'ReferenceCode ServiceCategory Subtype Description Status StatusHistory FullName Email Phone AssignedTo createdAt updatedAt';

const statusUpdateSchema = z.object({
  Status: z.enum(REQUEST_STATUSES),
  Note: z.string().trim().max(1000).optional().default(''),
});

export const teamRouter = Router();

teamRouter.use(requireStaff);

async function findAssignedRequest(referenceCode, userId) {
  return ServiceRequestModel.findOne({ ReferenceCode: referenceCode, AssignedTo: userId })
    .select(TEAM_REQUEST_FIELDS)
    .lean();
}

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

// Status updates from the assigned lawyer; manager/owner keep full control from the admin panel
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
// Lawyers must be assigned to the request; manager/owner may deliver work they did themselves.
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
