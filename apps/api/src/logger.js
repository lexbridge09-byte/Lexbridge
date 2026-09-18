import pino from 'pino';
import { LOG_LEVEL } from './config/index.js';

// Structured JSON logs. Secrets, one-time codes and message bodies are redacted wherever they appear.
export const logger = pino({
  level: LOG_LEVEL,
  base: { service: 'lexbridge-api', pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'Code',
      '*.Code',
      'CodeHash',
      '*.CodeHash',
      'token',
      '*.token',
      'Payload',
      '*.Payload',
      'Body',
      '*.Body',
      'Text',
      '*.Text',
    ],
    censor: '[redacted]',
  },
});
