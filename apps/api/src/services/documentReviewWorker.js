import Anthropic from '@anthropic-ai/sdk';
import { BRAND } from '../brand/index.js';
import {
  DOCUMENT_REVIEW_FILE_RETENTION_DAYS,
  DOCUMENT_REVIEW_POLL_INTERVAL_MS,
} from '../config/index.js';
import { logger } from '../logger.js';
import { DocumentReviewModel, UserModel } from '../models/index.js';
import { readStreamToBuffer } from '../utils.js';
import { notifyDocumentReviewFinished } from './commerceNotifications.js';
import { generateDocumentReview } from './documentReviewAssistant.js';
import { deleteDocumentFile, openDocumentStream } from './documentStorage.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Covers a slow review of a long document; a crashed worker's job is picked up after this
const JOB_LOCK_MS = 10 * 60 * 1000;
const BASE_RETRY_MS = 15 * 1000;
const MAX_RETRY_MS = 10 * 60 * 1000;
const BATCH_SIZE = 3;
const FILE_SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const FILE_SWEEP_BATCH_SIZE = 50;

let pollTimer = null;
let activeTick = null;
let isStopping = false;
let lastFileSweepAt = 0;

function deriveRetryDelayMs(attempts) {
  const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

function deriveFileDeleteAfter() {
  return new Date(Date.now() + DOCUMENT_REVIEW_FILE_RETENTION_DAYS * DAY_MS);
}

// Atomic claim, oldest first. Safe with many API instances.
function claimNextReview() {
  const now = new Date();
  return DocumentReviewModel.findOneAndUpdate(
    {
      $or: [
        { Status: 'queued', nextAttemptAt: { $lte: now } },
        { Status: 'processing', lockedUntil: { $lte: now } },
      ],
    },
    { $set: { Status: 'processing', lockedUntil: new Date(now.getTime() + JOB_LOCK_MS) }, $inc: { Attempts: 1 } },
    { sort: { createdAt: 1 }, returnDocument: 'after' },
  ).lean();
}

// 4xx errors (other than rate limits) won't succeed on retry
function isPermanentError(err) {
  if (err?.status === 404) return true;
  return err instanceof Anthropic.APIError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429;
}

async function finishReview(review, fields) {
  const finished = await DocumentReviewModel.findOneAndUpdate(
    { _id: review._id, Status: 'processing' },
    { $set: { ...fields, lockedUntil: null, completedAt: new Date(), fileDeleteAfter: deriveFileDeleteAfter() } },
    { returnDocument: 'after' },
  ).lean();
  if (!finished) return;
  const owner = await UserModel.findById(finished.Owner).select('FullName Email').lean();
  await notifyDocumentReviewFinished(finished, owner);
}

async function processReview(review) {
  const logContext = { reviewReference: review.ReferenceCode, attempts: review.Attempts };
  if (review.Attempts > review.MaxAttempts) {
    await finishReview(review, { Status: 'failed', FailureReason: 'error', LastError: 'Exceeded maximum attempts' });
    return;
  }

  try {
    const pdfBuffer = await readStreamToBuffer(await openDocumentStream(review.StoredName));
    const result = await generateDocumentReview({ pdfBase64: pdfBuffer.toString('base64') });
    const usageFields = { TokenUsage: result.usage, Model: result.model ?? '' };

    if (result.isRefusal) {
      await finishReview(review, { ...usageFields, Status: 'failed', FailureReason: 'declined', LastError: 'The model declined to review this document' });
      logger.warn(logContext, '[document-review] model declined the document');
      return;
    }

    await finishReview(review, {
      ...usageFields,
      Status: 'completed',
      FailureReason: '',
      LastError: '',
      RiskLevel: result.report.overallRisk,
      Report: { ...result.report, disclaimer: BRAND.documentReviewDisclaimer },
    });
  } catch (err) {
    const lastError = String(err?.message ?? err).slice(0, 1000);
    if (isPermanentError(err) || review.Attempts >= review.MaxAttempts) {
      await finishReview(review, { Status: 'failed', FailureReason: 'error', LastError: lastError });
      logger.error({ ...logContext, error: lastError }, '[document-review] review failed permanently');
      return;
    }
    await DocumentReviewModel.updateOne(
      { _id: review._id, Status: 'processing' },
      { $set: { Status: 'queued', lockedUntil: null, LastError: lastError, nextAttemptAt: new Date(Date.now() + deriveRetryDelayMs(review.Attempts)) } },
    );
    logger.warn({ ...logContext, error: lastError }, '[document-review] review failed, will retry');
  }
}

// Deletes uploaded files once their retention period ends (DPDP data minimisation)
async function sweepExpiredFiles() {
  const expiredReviews = await DocumentReviewModel.find({ FileDeletedAt: null, fileDeleteAfter: { $lte: new Date() } })
    .select('_id StoredName')
    .limit(FILE_SWEEP_BATCH_SIZE)
    .lean();
  for (const review of expiredReviews) {
    try {
      await deleteDocumentFile(review.StoredName);
      await DocumentReviewModel.updateOne({ _id: review._id, FileDeletedAt: null }, { $set: { FileDeletedAt: new Date() } });
    } catch (err) {
      logger.error({ err, reviewId: String(review._id) }, '[document-review] failed to delete expired file');
    }
  }
}

async function runTick() {
  if (Date.now() - lastFileSweepAt > FILE_SWEEP_INTERVAL_MS) {
    lastFileSweepAt = Date.now();
    await sweepExpiredFiles();
  }
  const claimedReviews = [];
  while (claimedReviews.length < BATCH_SIZE && !isStopping) {
    const review = await claimNextReview();
    if (!review) break;
    claimedReviews.push(review);
  }
  await Promise.allSettled(claimedReviews.map(processReview));
}

export function startDocumentReviewWorker() {
  if (pollTimer) return;
  isStopping = false;

  const tick = () => {
    if (activeTick || isStopping) return;
    activeTick = runTick()
      .catch((err) => logger.error({ err }, '[document-review] worker tick failed'))
      .finally(() => {
        activeTick = null;
      });
  };

  pollTimer = setInterval(tick, DOCUMENT_REVIEW_POLL_INTERVAL_MS);
  pollTimer.unref();
  tick();
  logger.info({ pollIntervalMs: DOCUMENT_REVIEW_POLL_INTERVAL_MS }, '[document-review] worker started');
}

export async function stopDocumentReviewWorker() {
  isStopping = true;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (activeTick) await activeTick;
}
