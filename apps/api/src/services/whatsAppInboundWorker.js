import { WHATSAPP_INBOUND_POLL_INTERVAL_MS } from '../config/index.js';
import { logger } from '../logger.js';
import { WhatsAppContactModel, WhatsAppInboundJobModel } from '../models/index.js';
import { prepareInboundReplies, recordOutboundMessage } from './whatsAppAgent.js';
import { sendWhatsAppText } from './whatsappService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Covers a slow AI reply plus sending; a crashed worker's job and contact are picked up after this
const JOB_LOCK_MS = 5 * 60 * 1000;
const CONTACT_LOCK_MS = 5 * 60 * 1000;
// How long a job waits when another message from the same number is still being handled
const DEFER_MS = 750;
const BASE_RETRY_MS = 5 * 1000;
const MAX_RETRY_MS = 10 * 60 * 1000;
// Done jobs are kept past Meta's retry period so repeated deliveries are still recognised
const DONE_RETENTION_MS = 8 * DAY_MS;
const FAILED_RETENTION_MS = 30 * DAY_MS;
const BATCH_SIZE = 10;

let pollTimer = null;
let activeTick = null;
let isStopping = false;

function deriveRetryDelayMs(attempts) {
  const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(delay * (0.8 + Math.random() * 0.4));
}

// Atomic claim, oldest message first. Safe with many API instances.
function claimNextJob() {
  const now = new Date();
  return WhatsAppInboundJobModel.findOneAndUpdate(
    {
      $or: [
        { Status: 'pending', nextAttemptAt: { $lte: now } },
        { Status: 'processing', lockedUntil: { $lte: now } },
      ],
    },
    { $set: { Status: 'processing', lockedUntil: new Date(now.getTime() + JOB_LOCK_MS) }, $inc: { Attempts: 1 } },
    { sort: { ReceivedAt: 1 }, returnDocument: 'after' },
  ).lean();
}

// One number's messages are handled one at a time, so replies stay in order and credits can't race
function acquireContactLock(phone) {
  const now = new Date();
  return WhatsAppContactModel.findOneAndUpdate(
    { Phone: phone, $or: [{ processingLockedUntil: null }, { processingLockedUntil: { $lte: now } }] },
    { $set: { processingLockedUntil: new Date(now.getTime() + CONTACT_LOCK_MS) } },
    { projection: { _id: 1 } },
  ).lean();
}

function releaseContactLock(contactId) {
  return WhatsAppContactModel.updateOne({ _id: contactId }, { $set: { processingLockedUntil: null } });
}

// Puts the job back without counting the attempt
function deferJob(job) {
  return WhatsAppInboundJobModel.updateOne(
    { _id: job._id, Status: 'processing' },
    { $set: { Status: 'pending', lockedUntil: null, nextAttemptAt: new Date(Date.now() + DEFER_MS) }, $inc: { Attempts: -1 } },
  );
}

// Message content lives in whatsAppMessages (with its own retention); the job keeps only what dedupe needs
function finishJob(job, status, lastError, retentionMs) {
  return WhatsAppInboundJobModel.updateOne(
    { _id: job._id, Status: 'processing' },
    {
      $set: {
        Status: status,
        lockedUntil: null,
        LastError: lastError,
        finishedAt: new Date(),
        expiresAt: new Date(Date.now() + retentionMs),
        Text: '',
        OutgoingMessages: [],
      },
    },
  );
}

async function sendOutgoingMessages(job, contactId) {
  for (let index = job.SentCount; index < job.OutgoingMessages.length; index++) {
    const message = job.OutgoingMessages[index];
    const result = await sendWhatsAppText({ to: job.Phone, body: message.Body });
    if (result.status === 'failed') {
      const error = new Error(result.error);
      error.isPermanent = result.isPermanent;
      throw error;
    }
    await recordOutboundMessage({ contactId, body: message.Body, kind: message.Kind, waMessageId: result.messageId });
    await WhatsAppInboundJobModel.updateOne({ _id: job._id }, { $set: { SentCount: index + 1 } });
  }
}

async function processJob(job) {
  const logContext = { jobId: String(job._id), attempts: job.Attempts };

  if (job.Attempts > job.MaxAttempts) {
    await finishJob(job, 'failed', 'Exceeded maximum attempts', FAILED_RETENTION_MS);
    logger.error(logContext, '[whatsapp-agent] inbound job exceeded maximum attempts');
    return;
  }

  const lockedContact = await acquireContactLock(job.Phone);
  if (!lockedContact) {
    if (await WhatsAppContactModel.exists({ Phone: job.Phone })) {
      await deferJob(job);
    } else {
      await finishJob(job, 'failed', 'WhatsApp contact not found', FAILED_RETENTION_MS);
    }
    return;
  }

  try {
    let current = job;
    if (current.Stage === 'received') {
      const outgoingMessages = await prepareInboundReplies(current);
      // Once replies are decided they're stored, so a retry only resends; it never re-charges or re-asks the AI
      current = await WhatsAppInboundJobModel.findOneAndUpdate(
        { _id: job._id, Status: 'processing' },
        {
          $set: {
            Stage: 'ready',
            OutgoingMessages: outgoingMessages.map(({ Body, Kind }) => ({ Body, Kind })),
            SentCount: 0,
          },
        },
        { returnDocument: 'after' },
      ).lean();
      if (!current) return;
    }

    await sendOutgoingMessages(current, lockedContact._id);
    await finishJob(current, 'done', '', DONE_RETENTION_MS);
  } catch (err) {
    const lastError = String(err?.message ?? err).slice(0, 1000);
    const isFinalAttempt = Boolean(err?.isPermanent) || job.Attempts >= job.MaxAttempts;
    if (isFinalAttempt) {
      await finishJob(job, 'failed', lastError, FAILED_RETENTION_MS);
      logger.error({ ...logContext, error: lastError }, '[whatsapp-agent] inbound job failed permanently');
      return;
    }
    await WhatsAppInboundJobModel.updateOne(
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
    logger.warn({ ...logContext, error: lastError }, '[whatsapp-agent] inbound job failed, will retry');
  } finally {
    await releaseContactLock(lockedContact._id).catch((err) => {
      logger.error({ err }, '[whatsapp-agent] failed to release contact lock');
    });
  }
}

async function runTick() {
  const claimedJobs = [];
  while (claimedJobs.length < BATCH_SIZE && !isStopping) {
    const job = await claimNextJob();
    if (!job) break;
    claimedJobs.push(job);
  }
  await Promise.allSettled(claimedJobs.map(processJob));
}

export function startWhatsAppInboundWorker() {
  if (pollTimer) return;
  isStopping = false;

  const tick = () => {
    if (activeTick || isStopping) return;
    activeTick = runTick()
      .catch((err) => logger.error({ err }, '[whatsapp-agent] worker tick failed'))
      .finally(() => {
        activeTick = null;
      });
  };

  pollTimer = setInterval(tick, WHATSAPP_INBOUND_POLL_INTERVAL_MS);
  pollTimer.unref();
  tick();
  logger.info({ pollIntervalMs: WHATSAPP_INBOUND_POLL_INTERVAL_MS }, '[whatsapp-agent] inbound worker started');
}

export async function stopWhatsAppInboundWorker() {
  isStopping = true;
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (activeTick) await activeTick;
}
