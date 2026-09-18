import mongoose from 'mongoose';

// Shared rate-limit counters, so limits hold across every API instance
const rateLimitHitSchema = new mongoose.Schema(
  {
    _id: { type: String },
    count: { type: Number, default: 0 },
    // TTL index: MongoDB deletes the counter once its window has passed
    resetAt: { type: Date, required: true, expires: 0 },
  },
  { collection: 'rateLimitHits', versionKey: false },
);

export const RateLimitHitModel = mongoose.model('RateLimitHit', rateLimitHitSchema);
