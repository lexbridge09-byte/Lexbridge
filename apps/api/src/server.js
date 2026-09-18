import cluster from 'node:cluster';
import http from 'node:http';
import { createApp } from './app.js';
import {
  NOTIFICATION_WORKER_ENABLED,
  PORT,
  SHUTDOWN_TIMEOUT_MS,
  UPLOAD_TIMEOUT_MS,
  DOCUMENT_REVIEW_WORKER_ENABLED,
  WHATSAPP_INBOUND_WORKER_ENABLED,
} from './config/index.js';
import { connectDb, disconnectDb } from './db/index.js';
import { isFeatureEnabled } from './brand/index.js';
import { logger } from './logger.js';
import {
  startDocumentReviewWorker,
  startNotificationWorker,
  startWhatsAppInboundWorker,
  stopDocumentReviewWorker,
  stopNotificationWorker,
  stopWhatsAppInboundWorker,
} from './services/index.js';

await connectDb();

const app = createApp();
const server = http.createServer(app);
// Keep idle keep-alive connections open longer than typical load balancer idle timeouts (60 s)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
// Hard cap on receiving a request, including slow uploads
server.requestTimeout = UPLOAD_TIMEOUT_MS + 10_000;

// A larger accept backlog absorbs connection bursts instead of resetting them
server.listen({ port: PORT, backlog: 2048 }, () => {
  logger.info(`[server] LexBridge API listening on http://localhost:${PORT}`);
});

if (NOTIFICATION_WORKER_ENABLED) startNotificationWorker();
if (WHATSAPP_INBOUND_WORKER_ENABLED && isFeatureEnabled('whatsAppAiAssistant')) startWhatsAppInboundWorker();
if (DOCUMENT_REVIEW_WORKER_ENABLED && isFeatureEnabled('aiDocumentReview')) startDocumentReviewWorker();

let isShuttingDown = false;

// Stop taking new connections, let in-flight requests and deliveries finish, then close the database
async function shutDown(reason, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  app.locals.isShuttingDown = true;
  logger.info({ reason }, '[server] shutting down');

  const forceExitTimer = setTimeout(() => {
    logger.error('[server] shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExitTimer.unref();

  try {
    const serverClosed = new Promise((resolve) => server.close(resolve));
    server.closeIdleConnections();
    await Promise.all([serverClosed, stopNotificationWorker(), stopWhatsAppInboundWorker(), stopDocumentReviewWorker()]);
    await disconnectDb();
  } catch (err) {
    logger.error({ err }, '[server] error during shutdown');
    exitCode = 1;
  }
  process.exit(exitCode);
}

process.on('SIGTERM', () => shutDown('SIGTERM'));
process.on('SIGINT', () => shutDown('SIGINT'));
// In cluster mode the primary disconnects a worker to stop it gracefully
if (cluster.isWorker) process.on('disconnect', () => shutDown('cluster disconnect'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, '[process] unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, '[process] uncaught exception');
  shutDown('uncaughtException', 1);
});
