import mongoose from 'mongoose';

export const NOTIFICATION_CHANNELS = ['email', 'whatsapp'];
export const NOTIFICATION_JOB_STATUSES = ['pending', 'processing', 'sent', 'skipped', 'failed'];

// Outbox: notifications are stored first, then delivered by a worker with retries
const notificationJobSchema = new mongoose.Schema(
  {
    Channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    EventName: { type: String, required: true, maxlength: 60 },
    Payload: { type: mongoose.Schema.Types.Mixed, required: true },
    Status: { type: String, enum: NOTIFICATION_JOB_STATUSES, default: 'pending' },
    Attempts: { type: Number, default: 0 },
    MaxAttempts: { type: Number, required: true, min: 1 },
    LastError: { type: String, default: '', maxlength: 1000 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    // TTL index: finished jobs are removed after their retention period; unfinished jobs never expire
    expiresAt: { type: Date, default: null, expires: 0 },
  },
  { timestamps: true, collection: 'notificationJobs', minimize: false },
);

notificationJobSchema.index({ Status: 1, nextAttemptAt: 1 });
notificationJobSchema.index({ Status: 1, lockedUntil: 1 });

export const NotificationJobModel = mongoose.model('NotificationJob', notificationJobSchema);
