import { Router } from 'express';
import { isFeatureEnabled } from '../brand/index.js';
import {
  IS_RAZORPAY_CONFIGURED,
  IS_WHATSAPP_AGENT_CONFIGURED,
  RAZORPAY_WEBHOOK_SECRET,
  WHATSAPP_APP_SECRET,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN,
} from '../config/index.js';
import { requireFeature } from '../middleware/index.js';
import { RazorpayWebhookEventModel } from '../models/index.js';
import {
  applyOrderWebhookEvent,
  applyRazorpayWebhookEvent,
  extractInboundMessages,
  ingestInboundMessages,
  isSameSecret,
  isValidHmacSignature,
} from '../services/index.js';

const RAZORPAY_EVENT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// app.js mounts express.raw() on /api/webhooks, so req.body is the exact Buffer that was signed
function parseRawJson(rawBody) {
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    return null;
  }
}

function readQueryValue(query, name) {
  const value = query[name] ?? query[name.replace('hub.', '')];
  return typeof value === 'string' ? value : '';
}

// Razorpay sends WhatsApp question-pack links and catalogue checkout payments to the same URL
function requireRazorpayWebhookFeature(req, res, next) {
  if (isFeatureEnabled('whatsAppAiAssistant') || isFeatureEnabled('onlinePayments')) return next();
  res.status(404).json({ error: 'This feature is not available.' });
}

function dispatchRazorpayEvent(event) {
  // Payment link events also carry a payment entity, so they're recognised first
  if (event?.payload?.payment_link) {
    return isFeatureEnabled('whatsAppAiAssistant') ? applyRazorpayWebhookEvent(event) : 'ignored';
  }
  return isFeatureEnabled('onlinePayments') ? applyOrderWebhookEvent(event) : 'ignored';
}

export const webhooksRouter = Router();

// Meta's one-time verification when the webhook URL is saved in the App Dashboard
webhooksRouter.get('/whatsapp', requireFeature('whatsAppAiAssistant'), (req, res) => {
  const mode = readQueryValue(req.query, 'hub.mode');
  const verifyToken = readQueryValue(req.query, 'hub.verify_token');
  const challenge = readQueryValue(req.query, 'hub.challenge');

  const isVerified = IS_WHATSAPP_AGENT_CONFIGURED
    && mode === 'subscribe'
    && challenge !== ''
    && isSameSecret(verifyToken, WHATSAPP_VERIFY_TOKEN);
  if (!isVerified) return res.sendStatus(403);
  res.type('text/plain').send(challenge);
});

// Inbound messages and status callbacks. Stores work and answers 200 quickly; the worker replies.
webhooksRouter.post('/whatsapp', requireFeature('whatsAppAiAssistant'), async (req, res) => {
  if (!IS_WHATSAPP_AGENT_CONFIGURED) return res.sendStatus(200);

  const isSigned = isValidHmacSignature({
    rawBody: req.body,
    secret: WHATSAPP_APP_SECRET,
    signature: req.get('x-hub-signature-256'),
    prefix: 'sha256=',
  });
  if (!isSigned) {
    req.log.warn('[webhooks] WhatsApp signature check failed');
    return res.sendStatus(401);
  }

  const payload = parseRawJson(req.body);
  if (!payload) return res.sendStatus(400);

  const { queued } = await ingestInboundMessages(extractInboundMessages(payload, WHATSAPP_PHONE_NUMBER_ID));
  if (queued > 0) req.log.info({ queued }, '[webhooks] WhatsApp messages queued');
  res.sendStatus(200);
});

webhooksRouter.post('/razorpay', requireRazorpayWebhookFeature, async (req, res) => {
  if (!IS_RAZORPAY_CONFIGURED) return res.sendStatus(200);

  const isSigned = isValidHmacSignature({
    rawBody: req.body,
    secret: RAZORPAY_WEBHOOK_SECRET,
    signature: req.get('x-razorpay-signature'),
  });
  if (!isSigned) {
    req.log.warn('[webhooks] Razorpay signature check failed');
    return res.sendStatus(401);
  }

  const event = parseRawJson(req.body);
  if (!event) return res.sendStatus(400);

  const eventId = req.get('x-razorpay-event-id') ?? '';
  if (eventId && await RazorpayWebhookEventModel.exists({ EventId: eventId })) {
    return res.json({ ok: true, outcome: 'duplicate' });
  }

  // Applying is idempotent, so the event id is recorded afterwards; a failure before this point is retried by Razorpay
  const outcome = await dispatchRazorpayEvent(event);
  if (eventId) {
    await RazorpayWebhookEventModel.updateOne(
      { EventId: eventId },
      {
        $setOnInsert: {
          Event: String(event.event ?? '').slice(0, 80),
          Outcome: outcome,
          expiresAt: new Date(Date.now() + RAZORPAY_EVENT_RETENTION_MS),
        },
      },
      { upsert: true },
    ).catch((err) => {
      if (err?.code !== 11000) throw err;
    });
  }
  req.log.info({ event: event.event, outcome }, '[webhooks] Razorpay event handled');
  res.json({ ok: true, outcome });
});
