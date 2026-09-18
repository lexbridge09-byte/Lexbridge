import cluster from 'node:cluster';
import { SHUTDOWN_TIMEOUT_MS, WEB_CONCURRENCY } from './config/index.js';
import { logger } from './logger.js';

const RESTART_WINDOW_MS = 60_000;
const MAX_RESTARTS_PER_WINDOW = 10;

/*
  Runs WEB_CONCURRENCY copies of the API on one machine, sharing the port.
  Every worker is stateless (sessions are JWTs; rate limits, OTPs and the outbox live in MongoDB),
  so the same code also scales out across machines behind a load balancer.
*/
if (cluster.isPrimary) {
  let isShuttingDown = false;
  let recentRestarts = [];

  for (let i = 0; i < WEB_CONCURRENCY; i++) cluster.fork();
  logger.info({ workers: WEB_CONCURRENCY }, '[cluster] started workers');

  cluster.on('exit', (worker, code, signal) => {
    if (isShuttingDown) {
      if (Object.keys(cluster.workers).length === 0) process.exit(0);
      return;
    }
    const now = Date.now();
    recentRestarts = recentRestarts.filter((restartedAt) => now - restartedAt < RESTART_WINDOW_MS);
    if (recentRestarts.length >= MAX_RESTARTS_PER_WINDOW) {
      logger.fatal('[cluster] workers keep crashing; stopping instead of restarting in a loop');
      process.exit(1);
    }
    recentRestarts.push(now);
    logger.error({ workerPid: worker.process.pid, code, signal }, '[cluster] worker exited, starting a replacement');
    cluster.fork();
  });

  const shutDown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, '[cluster] shutting down workers');
    for (const worker of Object.values(cluster.workers)) worker?.disconnect();
    setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS + 2000).unref();
  };
  process.on('SIGTERM', () => shutDown('SIGTERM'));
  process.on('SIGINT', () => shutDown('SIGINT'));
} else {
  await import('./server.js');
}
