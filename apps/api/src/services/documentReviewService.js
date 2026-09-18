import {
  DOCUMENT_REVIEW_DAILY_LIMIT,
  DOCUMENT_REVIEW_MAX_ATTEMPTS,
  DOCUMENT_REVIEW_MAX_PAGES,
} from '../config/index.js';
import { DocumentModel, DocumentReviewModel, ServiceRequestModel, UserModel } from '../models/index.js';
import { createHttpError, createWithUniqueReference, deriveSafeFileName } from '../utils.js';
import { deleteDocumentFile, detectDocumentType, saveDocumentFile } from './documentStorage.js';
import { notifyRequestReceived } from './notificationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const CLIENT_REVIEW_LIST_KEYS = [
  '_id',
  'ReferenceCode',
  'OriginalName',
  'SizeBytes',
  'Status',
  'RiskLevel',
  'FailureReason',
  'ServiceRequestReference',
  'createdAt',
  'completedAt',
];
const CLIENT_REVIEW_KEYS = [...CLIENT_REVIEW_LIST_KEYS, 'Report', 'FileDeletedAt'];

export const CLIENT_REVIEW_LIST_FIELDS = CLIENT_REVIEW_LIST_KEYS.join(' ');
export const CLIENT_REVIEW_FIELDS = CLIENT_REVIEW_KEYS.join(' ');

export function extractClientReview(review) {
  return Object.fromEntries(CLIENT_REVIEW_KEYS.map((key) => [key, review[key] ?? null]));
}

// Cheap page estimate from the raw bytes. Compressed object streams can hide pages, so 0 means "unknown".
export function estimatePdfPageCount(buffer) {
  return (buffer.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

// Failed reviews don't use up the allowance, since the client got nothing from them
export async function getReviewAllowance(ownerId) {
  const used = await DocumentReviewModel.countDocuments({
    Owner: ownerId,
    createdAt: { $gte: new Date(Date.now() - DAY_MS) },
    Status: { $ne: 'failed' },
  });
  return { limit: DOCUMENT_REVIEW_DAILY_LIMIT, used, remaining: Math.max(0, DOCUMENT_REVIEW_DAILY_LIMIT - used) };
}

export async function createDocumentReview({ file, owner }) {
  const allowance = await getReviewAllowance(owner.id);
  if (allowance.remaining === 0) {
    throw createHttpError(429, `You can review up to ${allowance.limit} documents in 24 hours. Please try again later.`);
  }
  if (detectDocumentType(file.buffer) !== 'application/pdf') {
    throw createHttpError(400, 'Upload a PDF document up to 10 MB.');
  }
  const pageCountEstimate = estimatePdfPageCount(file.buffer);
  if (pageCountEstimate > DOCUMENT_REVIEW_MAX_PAGES) {
    throw createHttpError(400, `Upload a document of up to ${DOCUMENT_REVIEW_MAX_PAGES} pages.`);
  }

  const { storedName } = await saveDocumentFile({ buffer: file.buffer, declaredMimeType: file.mimetype });
  try {
    const review = await createWithUniqueReference('LR', (referenceCode) => DocumentReviewModel.create({
      ReferenceCode: referenceCode,
      Owner: owner.id,
      OriginalName: deriveSafeFileName(file.originalname),
      StoredName: storedName,
      SizeBytes: file.size,
      PageCountEstimate: pageCountEstimate,
      MaxAttempts: DOCUMENT_REVIEW_MAX_ATTEMPTS,
      nextAttemptAt: new Date(),
    }));
    return extractClientReview(review);
  } catch (err) {
    await deleteDocumentFile(storedName);
    throw err;
  }
}

/*
  Turns a review into a contract-review service request for the legal team, attaching the uploaded file.
  Idempotent: a second call returns the existing request. The file is then kept (no retention delete),
  because the team's request now refers to it.
*/
export async function requestLawyerReview({ referenceCode, user, input }) {
  const review = await DocumentReviewModel.findOne({ ReferenceCode: referenceCode, Owner: user.id }).lean();
  if (!review) throw createHttpError(404, 'Review not found');
  if (review.ServiceRequestReference) return { review: extractClientReview(review), isNew: false };
  if (!['completed', 'failed'].includes(review.Status)) throw createHttpError(409, 'The review is still being prepared.');
  if (review.FileDeletedAt) {
    throw createHttpError(409, 'This document was deleted after the retention period. Please upload it again.');
  }

  const claimedReview = await DocumentReviewModel.findOneAndUpdate(
    { _id: review._id, lawyerReviewRequestedAt: null },
    { $set: { lawyerReviewRequestedAt: new Date(), fileDeleteAfter: null } },
    { returnDocument: 'after' },
  ).lean();
  if (!claimedReview) {
    return { review: extractClientReview(await DocumentReviewModel.findById(review._id).lean()), isNew: false };
  }

  const account = await UserModel.findById(user.id).select('FullName Email').lean();
  const now = new Date();
  const summaryText = review.Report?.plainSummary ? `\n\nAutomated summary: ${review.Report.plainSummary}` : '';
  const notesText = input.Notes ? `\n\nClient's notes: ${input.Notes}` : '';
  const request = await createWithUniqueReference('LB', (requestReference) => ServiceRequestModel.create({
    ReferenceCode: requestReference,
    Client: user.id,
    FullName: input.FullName || account?.FullName || 'LexBridge client',
    Email: account?.Email ?? user.email,
    Phone: input.Phone,
    ServiceCategory: 'contract-review',
    Subtype: String(review.Report?.documentType ?? '').slice(0, 120),
    Description: `Lawyer review requested for "${review.OriginalName}" (automated review ${review.ReferenceCode}, overall risk: ${review.RiskLevel || 'not rated'}).${notesText}${summaryText}`.slice(0, 5000),
    Source: 'document-review',
    StatusHistory: [{ Status: 'submitted', changedAt: now }],
    PreferredLanguage: input.PreferredLanguage,
    WhatsAppOptIn: input.WhatsAppOptIn,
    ConsentGiven: true,
    consentedAt: now,
  }));

  await DocumentModel.create({
    Owner: user.id,
    RequestReference: request.ReferenceCode,
    OriginalName: review.OriginalName,
    StoredName: review.StoredName,
    MimeType: 'application/pdf',
    SizeBytes: review.SizeBytes,
    UploadedByRole: 'client',
    UploadedBy: user.id,
  });

  const linkedReview = await DocumentReviewModel.findOneAndUpdate(
    { _id: review._id },
    { $set: { ServiceRequest: request._id, ServiceRequestReference: request.ReferenceCode } },
    { returnDocument: 'after' },
  ).lean();
  await notifyRequestReceived(request);
  return { review: extractClientReview(linkedReview), isNew: true };
}
