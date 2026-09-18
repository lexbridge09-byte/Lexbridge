import mongoose from 'mongoose';
import {
  MONGO_AUTO_INDEX,
  MONGO_MAX_POOL_SIZE,
  MONGO_MIN_POOL_SIZE,
  MONGO_SERVER_SELECTION_TIMEOUT_MS,
  MONGO_SOCKET_TIMEOUT_MS,
  MONGO_URI,
} from '../config/index.js';
import { logger } from '../logger.js';

const PING_TIMEOUT_MS = 2000;

let hasBoundConnectionEvents = false;

function bindConnectionEvents() {
  if (hasBoundConnectionEvents) return;
  hasBoundConnectionEvents = true;
  mongoose.connection.on('disconnected', () => logger.warn('[db] disconnected from MongoDB'));
  mongoose.connection.on('reconnected', () => logger.info('[db] reconnected to MongoDB'));
  mongoose.connection.on('error', (err) => logger.error({ err }, '[db] connection error'));
}

export async function connectDb() {
  bindConnectionEvents();
  await mongoose.connect(MONGO_URI, {
    maxPoolSize: MONGO_MAX_POOL_SIZE,
    minPoolSize: MONGO_MIN_POOL_SIZE,
    serverSelectionTimeoutMS: MONGO_SERVER_SELECTION_TIMEOUT_MS,
    socketTimeoutMS: MONGO_SOCKET_TIMEOUT_MS,
    autoIndex: MONGO_AUTO_INDEX,
  });
  logger.info(
    { maxPoolSize: MONGO_MAX_POOL_SIZE, autoIndex: MONGO_AUTO_INDEX, database: mongoose.connection.name },
    '[db] connected to MongoDB',
  );
}

export async function disconnectDb() {
  await mongoose.connection.close();
  logger.info('[db] connection closed');
}

// Readiness check: true only when MongoDB answers a ping quickly
export async function isDbReachable() {
  if (mongoose.connection.readyState !== 1) return false;
  let timer;
  try {
    await Promise.race([
      mongoose.connection.db.admin().ping(),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('ping timed out')), PING_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
