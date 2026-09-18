import { Router } from 'express';
import { z } from 'zod';
import { uploadSingleDocument } from '../../middleware/index.js';
import { ConsultationModel, ServiceRequestModel, UserModel } from '../../models/index.js';
import { createHttpError } from '../../utils.js';
import { createDocumentRecord, extractClientDocument } from '../documents.routes.js';

const uploadFieldsSchema = z.object({
  RequestReference: z.string().trim().min(1, 'Choose the request this document belongs to').max(40),
});

// A request submitted before sign-up has only an email; create the account so the client sees the file on first sign-in
async function findOrCreateRequestOwner(referenceCode) {
  const consultation = await ConsultationModel.findOne({ ReferenceCode: referenceCode }).select('Client').lean();
  if (consultation) return consultation.Client;

  const request = await ServiceRequestModel.findOne({ ReferenceCode: referenceCode })
    .select('Client Email FullName Phone')
    .lean();
  if (!request) return null;
  if (request.Client) return request.Client;
  // WhatsApp handoffs have only a phone number, so there is no account to attach the file to yet
  if (!request.Email) {
    throw createHttpError(400, 'This request has no email address yet, so the client has no account to receive documents. Add their email first.');
  }

  const owner = await UserModel.findOneAndUpdate(
    { Email: request.Email },
    { $setOnInsert: { FullName: request.FullName, Phone: request.Phone } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  return owner._id;
}

export const adminDocumentsRouter = Router();

adminDocumentsRouter.post('/', uploadSingleDocument, async (req, res) => {
  if (!req.file) throw createHttpError(400, 'Choose a file to upload.');
  const { RequestReference } = uploadFieldsSchema.parse(req.body ?? {});

  const ownerId = await findOrCreateRequestOwner(RequestReference);
  if (!ownerId) throw createHttpError(404, 'No request or consultation has that reference.');

  const document = await createDocumentRecord({
    file: req.file,
    ownerId,
    requestReference: RequestReference,
    uploadedByRole: 'admin',
    uploadedById: req.user.id,
  });
  res.status(201).json({ document: extractClientDocument(document) });
});
