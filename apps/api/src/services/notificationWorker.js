import { NOTIFICATION_BATCH_SIZE, NOTIFICATION_POLL_INTERVAL_MS } from '../config/index.js';
import { logger } from '../logger.js';
import { NotificationJobModel } from '../models/index.js';
import { sendMail } from './mailService.js';
import { sendWhatsAppTemplate } from './whatsappService.js';

const LOCK_MS = 2 * 60 * 1000;
const BASE_RETRY_MS = 30 * 1000;
const MAX_RETRY_MS = 6 * 60 * 60 * 1000;
const SENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const FAILED_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

let pollTimer = null;
let activeTick = null;
let isStopping = false;

// Exponential backoff with ±20% jitter so retries from many jobs don't line up
function deriveRetryDelayMs(attempts) {
  const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

// Atomic claim, safe with many API instances: only one worker can move a given job to processing
function claimNextJob() {
  const now = new Date();
  return NotificationJobModel.findOneAndUpdate(
    {
      $or: [
        { Status: 'pending', nextAttemptAt: { $lte: now } },
        // A worker that died mid-delivery leaves its lock behind; the job is reclaimed once the lock expires
        { Status: 'processing', lockedUntil: { $lte: now } },
      ],
    },
    { $set: { Status: 'processing', lockedUntil: new Date(now.getTime() + LOCK_MS) }, $inc: { Attempts: 1 } },
    { returnDocument: 'after' },
  ).lean();
}

async function deliverJob(job) {
  if (job.Channel === 'email') {
    await sendMail(job.Payload);
    return 'sent';
  }
  if (job.Channel === 'whatsapp') {
    const result = await sendWhatsAppTemplate(job.Payload);
    if (result.status === 'failed') {
      const error = new Error(result.error);
      error.isPermanent = result.isPermanent;
      throw error;
    }
    return result.status;
  }
  const error = new Error(`Unknown notification channel: ${job.Channel}`);
  error.isPermanent = true;
  throw error;
}

// Message bodies can contain sign-in codes, so they're removed once a job is finished
async function finishJob(job, status, lastError, retentionMs) {
  await NotificationJobModel.updateOne(
    { _id: job._id, Status: 'processing' },
    {
      $set: {
        Status: status,
        lockedUntil: null,
        LastError: lastError,
        finishedAt: new Date(),
        expiresAt: new Date(Date.now() + retentionMs),
      },
      $unset: { 'Payload.text': '' },
    },
  );
}

async function processJob(job) {
  const logContext = { jobId: String(job._id), eventName: job.EventName, channel: job.Channel, attempts: job.Attempts };

  if (job.Attempts > job.MaxAttempts) {
    await finishJob(job, 'failed', 'Exceeded maximum attempts', FAILED_RETENTION_MS);
    logger.error(logContext, '[notify] job exceeded maximum attempts');
    return;
  }

  try {
    const outcome = await deliverJob(job);
    await finishJob(job, outcome, '', SENT_RETENTION_MS);
  } catch (err) {
    const lastError = String(err?.message ?? err).slice(0, 1000);
    const isFinalAttempt = Boolean(err?.isPermanent) || job.Attempts >= job.MaxAttempts;
    if (isFinalAttempt) {
      await finishJob(job, 'failed', lastError, FAILED_RETENTION_MS);
      logger.error({ ...logContext, error: lastError }, '[notify] job failed permanently');
      return;
    }
    await NotificationJobModel.updateOne(
      { _id: job._id, Status: 'processing' },
      {
        $set: {
          Status: 'pending',
          lockedUntil: null,
          LastError: lastError,
          nextAttemptAt: new Date(Date.now() + deriveRetryDelayMs(job.Attempts)),
        },
      },
    );
    logger.warn({ ...logContext, error: lastError }, '[notify] job failed, will retry');
  }
}

async function runTick() {
  const claimedJobs = [];
  while (claimedJobs.length < NOTIFICATION_BATCH_SIZE && !isStopping) {
    const job = await claimNextJob();
    if (!job) break;
    claimedJobs.push(job);
  }
  await Promise.allSettled(claimedJobs.map(processJob));
}

export function startNotificationWorker() {
  if (pollTimer) return;
  isStopping = false;

  const tick = () => {
    if (activeTick || isStopping) return;
    activeTick = runTick()
      .catch((err) => logger.error({ err }, '[notify] worker tick failed'))
      .finally(() => {
        activeTick = null;
      });
  };

  pollTimer = setInterval(tick, NOTIFICATION_POLL_INTERVAL_MS);
  pollTimer.unref();
  tick();
  logger.info({ pollIntervalMs: NOTIFICATION_POLL_INTERVAL_MS }, '[notify] worker started');
}

// Stops polling and waits for in-flight deliveries to finish
export async function stopNotificationWorker() {
  isStopping = true;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (activeTick) await activeTick;
}
