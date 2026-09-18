import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { CLIENT_ORIGIN, TRUST_PROXY } from './config/index.js';
import { logger } from './logger.js';
import { applyRequestTimeout, handleErrors } from './middleware/index.js';
import { apiRouter } from './routes/index.js';

const REQUEST_ID_PATTERN = /^[\w-]{8,64}$/;
const QUIET_PATHS = new Set(['/api/health', '/api/ready']);

export function createApp() {
  const app = express();

  app.set('trust proxy', TRUST_PROXY);
  app.locals.isShuttingDown = false;

  // Request logging with a request id that is echoed back as X-Request-Id
  app.use(pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incomingId = req.headers['x-request-id'];
      const requestId = typeof incomingId === 'string' && REQUEST_ID_PATTERN.test(incomingId) ? incomingId : randomUUID();
      res.setHeader('X-Request-Id', requestId);
      return requestId;
    },
    autoLogging: { ignore: (req) => QUIET_PATHS.has(req.url) },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Only method, path and status: no headers, so cookies never reach the logs
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));
  app.use(applyRequestTimeout);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
  // Webhook signatures are computed over the exact bytes received, so these routes keep the raw body.
  // express.raw marks the body as read, so express.json below skips them.
  app.use('/api/webhooks', express.raw({ type: () => true, limit: '1mb' }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiRouter);
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(handleErrors);

  return app;
}
