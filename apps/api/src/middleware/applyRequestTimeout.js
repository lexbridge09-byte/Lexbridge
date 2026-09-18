import { REQUEST_TIMEOUT_MS, UPLOAD_TIMEOUT_MS } from '../config/index.js';

// Answers with 503 if a handler hangs, so clients and load balancers aren't left waiting
export function applyRequestTimeout(req, res, next) {
  const timeoutMs = req.is('multipart/form-data') ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    req.log?.warn({ timeoutMs }, '[http] request timed out');
    res.status(503).json({ error: 'The server took too long to respond. Please try again.' });
  }, timeoutMs);
  timer.unref();
  res.on('close', () => clearTimeout(timer));
  next();
}
