import { RateLimitHitModel } from '../models/index.js';

const DUPLICATE_KEY_ERROR = 11000;

// express-rate-limit Store backed by MongoDB, so every API instance shares the same counters
export class MongoRateLimitStore {
  localKeys = false;

  constructor({ prefix }) {
    this.prefix = prefix;
    this.windowMs = 60_000;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  deriveId(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(key) {
    const now = new Date();
    const isWindowOver = { $lte: [{ $ifNull: ['$resetAt', new Date(0)] }, now] };
    // One atomic update: start a new window if the previous one is over, otherwise count the hit
    const update = [
      {
        $set: {
          count: { $cond: [isWindowOver, 1, { $add: ['$count', 1] }] },
          resetAt: { $cond: [isWindowOver, new Date(now.getTime() + this.windowMs), '$resetAt'] },
        },
      },
    ];
    const filter = { _id: this.deriveId(key) };
    const options = { upsert: true, returnDocument: 'after' };

    let hit;
    try {
      hit = await RateLimitHitModel.collection.findOneAndUpdate(filter, update, options);
    } catch (err) {
      // Two first hits for one key can race on the upsert; retrying updates the document the winner created
      if (err?.code !== DUPLICATE_KEY_ERROR) throw err;
      hit = await RateLimitHitModel.collection.findOneAndUpdate(filter, update, options);
    }
    return { totalHits: hit.count, resetTime: hit.resetAt };
  }

  async get(key) {
    const hit = await RateLimitHitModel.collection.findOne({ _id: this.deriveId(key), resetAt: { $gt: new Date() } });
    return hit ? { totalHits: hit.count, resetTime: hit.resetAt } : undefined;
  }

  async decrement(key) {
    await RateLimitHitModel.collection.updateOne(
      { _id: this.deriveId(key), resetAt: { $gt: new Date() }, count: { $gt: 0 } },
      { $inc: { count: -1 } },
    );
  }

  async resetKey(key) {
    await RateLimitHitModel.collection.deleteOne({ _id: this.deriveId(key) });
  }
}
