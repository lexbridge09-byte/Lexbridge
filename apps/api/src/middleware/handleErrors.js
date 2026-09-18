import mongoose from 'mongoose';
import multer from 'multer';
import { ZodError } from 'zod';
import { logger } from '../logger.js';

const UPLOAD_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: 'This file is larger than 10 MB.',
  LIMIT_FILE_COUNT: 'Upload one file at a time.',
  LIMIT_UNEXPECTED_FILE: 'Upload one file using the "file" field.',
};

const DATABASE_UNAVAILABLE_ERRORS = new Set([
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoPoolClearedError',
]);

// Express 5 forwards rejected promises from async handlers here automatically
export function handleErrors(err, req, res, next) {
  // The response already started (e.g. a download stream failed); let Express close the connection
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Please check the highlighted fields',
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ error: UPLOAD_ERROR_MESSAGES[err.code] ?? 'The upload could not be processed.' });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'This record already exists' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large' });
  }
  // The client or an upstream proxy dropped the connection mid-upload; not a server fault
  if (req.aborted || err?.message === 'Request aborted') {
    return res.status(400).json({ error: 'The upload was interrupted. Please try again.' });
  }
  if (DATABASE_UNAVAILABLE_ERRORS.has(err?.name)) {
    (req.log ?? logger).error({ err }, '[error] database unavailable');
    res.set('Retry-After', '5');
    return res.status(503).json({ error: 'LexBridge is temporarily unavailable. Please try again shortly.' });
  }
  if (!err?.expose) (req.log ?? logger).error({ err }, '[error] unhandled request error');
  res.status(err?.status ?? 500).json({ error: err?.expose ? err.message : 'Something went wrong' });
}
