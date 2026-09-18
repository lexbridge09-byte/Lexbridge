import rateLimit from 'express-rate-limit';
import { MongoRateLimitStore } from '../services/mongoRateLimitStore.js';

export function createRateLimiter({ name, windowMs, limit, message }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: message },
    store: new MongoRateLimitStore({ prefix: name }),
    // If MongoDB is briefly unreachable, serve the request rather than rejecting everyone
    passOnStoreError: true,
  });
}
