import { NOTIFICATION_MAX_ATTEMPTS } from '../config/index.js';
import { logger } from '../logger.js';
import { NotificationJobModel } from '../models/index.js';

/*
  Stores notifications in the outbox for the worker to deliver. Never throws: a notification
  problem must not fail the request that triggered it.
  jobs: [{ channel: 'email' | 'whatsapp', payload, maxAttempts? }] (falsy entries are ignored)
*/
export async function enqueueNotifications(eventName, jobs) {
  const now = new Date();
  const documents = jobs.filter(Boolean).map((job) => ({
    Channel: job.channel,
    EventName: eventName,
    Payload: job.payload,
    MaxAttempts: job.maxAttempts ?? NOTIFICATION_MAX_ATTEMPTS,
    nextAttemptAt: now,
  }));
  if (documents.length === 0) return;

  try {
    await NotificationJobModel.insertMany(documents, { ordered: false });
  } catch (err) {
    logger.error({ err, eventName }, '[notify] failed to queue notifications');
  }
}
