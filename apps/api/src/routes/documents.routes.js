import { pipeline } from 'node:stream/promises';
import { Router } from 'express';
import { z } from 'zod';
import { createRateLimiter, requireAuth, uploadSingleDocument } from '../middleware/index.js';
import { ConsultationModel, DocumentModel, ServiceRequestModel, UserModel } from '../models/index.js';
import { deleteDocumentFile, openDocumentStream, saveDocumentFile } from '../services/index.js';
import { createHttpError, deriveSafeFileName, objectIdSchema } from '../utils.js';

export const CLIENT_DOCUMENT_FIELDS = 'OriginalName MimeType SizeBytes RequestReference UploadedByRole createdAt';

const MAX_CLIENT_DOCUMENTS = 500;

const uploadLimiter = createRateLimiter({
  name: 'documents-upload',
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: 'Too many uploads. Please try again later.',
});

const uploadFieldsSchema = z.object({
  RequestReference: z.string().trim().max(40).optional().default(''),
});

async function isReferenceOwnedBy(referenceCode, user) {
  const [request, consultation] = await Promise.all([
    ServiceRequestModel.exists({
      ReferenceCode: referenceCode,
      $or: [{ Client: user.id }, { Email: user.email }],
    }),
    ConsultationModel.exists({ ReferenceCode: referenceCode, Client: user.id }),
  ]);
  return Boolean(request || consultation);
}

// Creates the Document record, removing the stored file if the record can't be saved
export async function createDocumentRecord({ file, ownerId, requestReference, uploadedByRole, uploadedById }) {
  const { storedName, mimeType } = await saveDocumentFile({
    buffer: file.buffer,
    declaredMimeType: file.mimetype,
  });
  try {
    return await DocumentModel.create({
      Owner: ownerId,
      RequestReference: requestReference,
      OriginalName: deriveSafeFileName(file.originalname),
      StoredName: storedName,
      MimeType: mimeType,
      SizeBytes: file.size,
      UploadedByRole: uploadedByRole,
      UploadedBy: uploadedById,
    });
  } catch (err) {
    await deleteDocumentFile(storedName);
    throw err;
  }
}

export function extractClientDocument(document) {
  return {
    _id: document._id,
    OriginalName: document.OriginalName,
    MimeType: document.MimeType,
    SizeBytes: document.SizeBytes,
    RequestReference: document.RequestReference,
    UploadedByRole: document.UploadedByRole,
    createdAt: document.createdAt,
  };
}

export const documentsRouter = Router();

documentsRouter.get('/mine', requireAuth, async (req, res) => {
  const documents = await DocumentModel.find({ Owner: req.user.id })
    .select(CLIENT_DOCUMENT_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_CLIENT_DOCUMENTS)
    .lean();
  res.json({ documents });
});

documentsRouter.post('/', requireAuth, uploadLimiter, uploadSingleDocument, async (req, res) => {
  if (!req.file) throw createHttpError(400, 'Choose a file to upload.');
  const { RequestReference } = uploadFieldsSchema.parse(req.body ?? {});

  if (RequestReference && !(await isReferenceOwnedBy(RequestReference, req.user))) {
    throw createHttpError(404, 'We could not find that request in your account.');
  }

  const document = await createDocumentRecord({
    file: req.file,
    ownerId: req.user.id,
    requestReference: RequestReference,
    uploadedByRole: 'client',
    uploadedById: req.user.id,
  });
  res.status(201).json({ document: extractClientDocument(document) });
});

documentsRouter.get('/:id/download', requireAuth, async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const document = await DocumentModel.findById(id).select('Owner OriginalName StoredName MimeType SizeBytes').lean();

  // Respond 404 rather than 403 so document ids can't be probed
  let isAllowed = Boolean(document) && String(document.Owner) === req.user.id;
  if (document && !isAllowed) {
    const user = await UserModel.findById(req.user.id).select('Role').lean();
    isAllowed = user?.Role === 'admin';
  }
  if (!isAllowed) throw createHttpError(404, 'Document not found');

  // Streamed from local disk or object storage, so large files never sit in memory
  const fileStream = await openDocumentStream(document.StoredName);
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, no-store');
  res.attachment(deriveSafeFileName(document.OriginalName));
  res.type(document.MimeType);
  if (document.SizeBytes) res.set('Content-Length', String(document.SizeBytes));

  try {
    await pipeline(fileStream, res);
  } catch (err) {
    // Usually the client went away mid-download; the connection is already closed
    req.log.warn({ error: err.message }, '[documents] download stream ended early');
  }
});
