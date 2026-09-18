import mongoose from 'mongoose';

export const WHATSAPP_INBOUND_JOB_STATUSES = ['pending', 'processing', 'done', 'failed'];
// received: replies not decided yet; ready: replies decided (credits settled), only sending remains
export const WHATSAPP_INBOUND_JOB_STAGES = ['received', 'ready'];

const outgoingMessageSchema = new mongoose.Schema(
  {
    Body: { type: String, required: true, maxlength: 4096 },
    Kind: { type: String, required: true },
  },
  { _id: false },
);

// Durable queue of inbound WhatsApp messages. The webhook stores a job and returns 200 at once;
// a worker in every API instance claims jobs atomically and replies.
const whatsAppInboundJobSchema = new mongoose.Schema(
  {
    // Unique: Meta retries deliveries, so a repeated message id is ignored at insert time
    WaMessageId: { type: String, required: true, unique: true },
    Phone: { type: String, required: true },
    ProfileName: { type: String, default: '' },
    MessageType: { type: String, default: 'text', maxlength: 30 },
    Text: { type: String, default: '', maxlength: 4096 },
    ReceivedAt: { type: Date, required: true },
    Status: { type: String, enum: WHATSAPP_INBOUND_JOB_STATUSES, default: 'pending' },
    Stage: { type: String, enum: WHATSAPP_INBOUND_JOB_STAGES, default: 'received' },
    ChargeType: { type: String, enum: ['none', 'free', 'paid'], default: 'none' },
    OutgoingMessages: { type: [outgoingMessageSchema], default: [] },
    SentCount: { type: Number, default: 0 },
    Attempts: { type: Number, default: 0 },
    MaxAttempts: { type: Number, default: 6, min: 1 },
    LastError: { type: String, default: '', maxlength: 1000 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    // TTL index: finished jobs are kept long enough to dedupe Meta's retries, then removed
    expiresAt: { type: Date, default: null, expires: 0 },
  },
  { timestamps: true, collection: 'whatsAppInboundJobs' },
);

whatsAppInboundJobSchema.index({ Status: 1, nextAttemptAt: 1, ReceivedAt: 1 });
whatsAppInboundJobSchema.index({ Status: 1, lockedUntil: 1 });

export const WhatsAppInboundJobModel = mongoose.model('WhatsAppInboundJob', whatsAppInboundJobSchema);
