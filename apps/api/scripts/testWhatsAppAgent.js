/*
  End-to-end test for the WhatsApp AI assistant, run against a throwaway database with mocked
  Meta, Razorpay and Anthropic endpoints (no real external calls).
  Usage (needs a local MongoDB): pnpm --filter @lexbridge/api test:whatsapp
*/
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const API_PORT = 5057;
const DISABLED_API_PORT = 5058;
const MOCK_PORT = 5098;
const MONGO_BASE_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'lexbridge_wa';
const DISABLED_DB_NAME = 'lexbridge_wa_disabled';
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const APP_SECRET = 'test-app-secret';
const VERIFY_TOKEN = 'test-verify-token';
const PHONE_NUMBER_ID = '106540352242922';
const RAZORPAY_WEBHOOK_SECRET = 'test-razorpay-webhook-secret';
const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${condition || !detail ? '' : ` — ${detail}`}`);
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// ---------- Mock Meta Graph API, Razorpay and Anthropic ----------
const DEFAULT_REPLY = {
  reply: 'Bail is sought after arrest; anticipatory bail is sought before an expected arrest. This is general information, not legal advice.',
  suggestedCategory: 'criminal-law',
  needsHumanHandoff: false,
  handoffSummary: '',
};

const mock = {
  sentMessages: [],
  readReceipts: [],
  paymentLinks: [],
  anthropicRequests: [],
  anthropicMode: 'ok',
  anthropicDelayMs: 0,
  nextReply: DEFAULT_REPLY,
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

const mockServer = http.createServer(async (req, res) => {
  const rawBody = await readRequestBody(req);
  const { pathname } = new URL(req.url, 'http://mock');

  if (req.method === 'POST' && pathname === `/v23.0/${PHONE_NUMBER_ID}/messages`) {
    const body = JSON.parse(rawBody);
    if (body.status === 'read') {
      mock.readReceipts.push(body);
      return sendJson(res, 200, { success: true });
    }
    mock.sentMessages.push({ ...body, authorization: req.headers.authorization });
    return sendJson(res, 200, {
      messaging_product: 'whatsapp',
      contacts: [{ input: body.to, wa_id: body.to }],
      messages: [{ id: `wamid.out.${crypto.randomUUID()}` }],
    });
  }

  if (req.method === 'POST' && pathname === '/v1/payment_links') {
    const body = JSON.parse(rawBody);
    const id = `plink_${crypto.randomBytes(7).toString('hex')}`;
    mock.paymentLinks.push({ id, body, authorization: req.headers.authorization });
    return sendJson(res, 200, {
      id,
      short_url: `https://rzp.io/i/${id}`,
      status: 'created',
      amount: body.amount,
      reference_id: body.reference_id,
      expire_by: body.expire_by,
    });
  }

  if (req.method === 'POST' && pathname.startsWith('/v1/messages')) {
    mock.anthropicRequests.push({ headers: req.headers, body: JSON.parse(rawBody) });
    if (mock.anthropicDelayMs) await sleep(mock.anthropicDelayMs);
    if (mock.anthropicMode === 'error') {
      return sendJson(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'mock failure' } });
    }
    const baseMessage = { id: `msg_${crypto.randomUUID()}`, type: 'message', role: 'assistant', model: 'claude-opus-5', stop_sequence: null };
    if (mock.anthropicMode === 'refusal') {
      return sendJson(res, 200, {
        ...baseMessage,
        content: [],
        stop_reason: 'refusal',
        stop_details: { type: 'refusal', category: null, explanation: 'mock refusal' },
        usage: { input_tokens: 900, output_tokens: 0 },
      });
    }
    return sendJson(res, 200, {
      ...baseMessage,
      content: [{ type: 'text', text: JSON.stringify(mock.nextReply) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1200, output_tokens: 180, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    });
  }

  sendJson(res, 404, { error: `mock: no route for ${req.method} ${pathname}` });
});

// ---------- API process ----------
let apiOutput = '';

function startApi({ port, dbName, isConfigured }) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|WHATSAPP_|RAZORPAY_|MONGO_|SMTP_|ADMIN_EMAILS|PUBLIC_SITE_URL)/.test(key)) delete env[key];
  }
  Object.assign(env, {
    NODE_ENV: 'test',
    PORT: String(port),
    MONGO_URI: `${MONGO_BASE_URI}/${dbName}`,
    JWT_SECRET,
    LOG_LEVEL: 'warn',
    NOTIFICATION_WORKER_ENABLED: 'false',
    WHATSAPP_INBOUND_POLL_INTERVAL_MS: '150',
    PUBLIC_SITE_URL: 'https://lexbridge.example',
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
  });
  if (isConfigured) {
    Object.assign(env, {
      WHATSAPP_TOKEN: 'test-whatsapp-token',
      WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
      WHATSAPP_API_VERSION: 'v23.0',
      WHATSAPP_APP_SECRET: APP_SECRET,
      WHATSAPP_VERIFY_TOKEN: VERIFY_TOKEN,
      WHATSAPP_GRAPH_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
      RAZORPAY_KEY_ID: 'rzp_test_key',
      RAZORPAY_KEY_SECRET: 'rzp_test_secret',
      RAZORPAY_WEBHOOK_SECRET,
      RAZORPAY_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    });
  }

  const child = spawn(process.execPath, ['src/server.js'], { cwd: API_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (chunk) => { apiOutput += chunk.toString(); });
  child.stderr.on('data', (chunk) => { apiOutput += chunk.toString(); });
  return child;
}

async function waitForApi(port) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/ready`);
      if (response.ok) return;
    } catch {
      // not listening yet
    }
    await sleep(200);
  }
  throw new Error(`API on port ${port} did not become ready\n${apiOutput.slice(-3000)}`);
}

async function callApi(port, pathname, { method = 'GET', body, rawBody, headers = {}, cookie } = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.cookie = cookie;
  let requestBody = rawBody;
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders['content-type'] = 'application/json';
    requestBody = JSON.stringify(body);
  } else if (body instanceof FormData) {
    requestBody = body;
  }
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers: requestHeaders, body: requestBody });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString('utf8');
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, text, json, buffer, headers: response.headers };
}

const api = (pathname, options) => callApi(API_PORT, pathname, options);

// ---------- Helpers ----------
function signHex(secret, raw) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

let messageCounter = 0;
function buildInboundMessage({ phone, text, type = 'text', id }) {
  messageCounter += 1;
  const message = {
    from: phone,
    id: id ?? `wamid.test.${messageCounter}.${crypto.randomUUID()}`,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type,
  };
  if (type === 'text') message.text = { body: text };
  if (type === 'image') message.image = { id: 'media-1', mime_type: 'image/jpeg' };
  return message;
}

function buildWebhookPayload(messages, { name = 'Test Person' } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: 'waba-1',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15550783881', phone_number_id: PHONE_NUMBER_ID },
          contacts: [...new Set(messages.map((message) => message.from))].map((waId) => ({ profile: { name }, wa_id: waId })),
          messages,
        },
      }],
    }],
  };
}

async function postWhatsAppPayload(payload, { signature } = {}) {
  const raw = JSON.stringify(payload);
  return api('/api/webhooks/whatsapp', {
    method: 'POST',
    rawBody: raw,
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature ?? `sha256=${signHex(APP_SECRET, raw)}` },
  });
}

async function sendText(phone, text, options = {}) {
  const message = buildInboundMessage({ phone, text, ...options });
  const response = await postWhatsAppPayload(buildWebhookPayload([message]));
  return { message, response };
}

let db;

async function waitForJobsIdle(label, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const openJobs = await db.collection('whatsAppInboundJobs').countDocuments({ Status: { $in: ['pending', 'processing'] } });
    if (openJobs === 0) return true;
    await sleep(100);
  }
  console.log(`  (timed out waiting for jobs: ${label})`);
  return false;
}

async function sendTextAndWait(phone, text, options) {
  const result = await sendText(phone, text, options);
  await sleep(50);
  await waitForJobsIdle(text);
  return result;
}

const textsSentTo = (phone) => mock.sentMessages.filter((message) => message.to === phone).map((message) => message.text?.body ?? '');
const lastTextSentTo = (phone) => textsSentTo(phone).at(-1) ?? '';
const findContact = (phone) => db.collection('whatsAppContacts').findOne({ Phone: phone });

function buildRazorpayEvent(paymentLinkId, { amountPaid = 19900, eventName = 'payment_link.paid' } = {}) {
  return {
    entity: 'event',
    account_id: 'acc_test',
    event: eventName,
    contains: ['payment_link', 'order', 'payment'],
    payload: {
      payment_link: { entity: { id: paymentLinkId, status: 'paid', amount: 19900, amount_paid: amountPaid, reference_id: 'ref', notes: null } },
      payment: { entity: { id: `pay_${crypto.randomBytes(7).toString('hex')}`, amount: amountPaid, status: 'captured' } },
      order: { entity: { id: 'order_test', status: 'paid' } },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}

async function postRazorpayEvent(event, { eventId, signature } = {}) {
  const raw = JSON.stringify(event);
  return api('/api/webhooks/razorpay', {
    method: 'POST',
    rawBody: raw,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature ?? signHex(RAZORPAY_WEBHOOK_SECRET, raw),
      'x-razorpay-event-id': eventId ?? `evt_${crypto.randomUUID()}`,
    },
  });
}

async function createUserSession({ email, role }) {
  const { insertedId } = await db.collection('users').insertOne({
    FullName: role === 'admin' ? 'Admin Tester' : 'Client Tester',
    Email: email,
    Phone: '',
    Role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const token = jwt.sign({ email }, JWT_SECRET, { subject: String(insertedId), expiresIn: '1h' });
  return `lexbridge_session=${token}`;
}

async function waitForIndexes() {
  const required = [
    ['whatsAppInboundJobs', 'WaMessageId_1'],
    ['whatsAppMessages', 'WaMessageId_1'],
    ['whatsAppContacts', 'Phone_1'],
    ['whatsAppPayments', 'RazorpayPaymentLinkId_1'],
    ['razorpayWebhookEvents', 'EventId_1'],
  ];
  for (let attempt = 0; attempt < 100; attempt++) {
    let isReady = true;
    for (const [collectionName, indexName] of required) {
      const indexes = await db.collection(collectionName).indexes().catch(() => []);
      if (!indexes.some((index) => index.name === indexName)) isReady = false;
    }
    if (isReady) return;
    await sleep(200);
  }
  throw new Error('Unique indexes were not built in time');
}

// ---------- Tests ----------
async function runWhatsAppTests() {
  const phoneA = '919876500001';
  const phoneB = '919876500002';
  const phoneC = '919876500003';

  // Webhook verification
  const verify = await api(`/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1158201444`);
  check('verification GET echoes the challenge', verify.status === 200 && verify.text === '1158201444', `${verify.status} ${verify.text}`);
  const badVerify = await api('/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1');
  check('verification GET with wrong token is 403', badVerify.status === 403, String(badVerify.status));

  // Signatures
  const unsignedPayload = buildWebhookPayload([buildInboundMessage({ phone: phoneA, text: 'unsigned' })]);
  const badSignature = await postWhatsAppPayload(unsignedPayload, { signature: `sha256=${'0'.repeat(64)}` });
  check('webhook with bad signature is 401', badSignature.status === 401, String(badSignature.status));
  const missingSignature = await api('/api/webhooks/whatsapp', {
    method: 'POST',
    rawBody: JSON.stringify(unsignedPayload),
    headers: { 'content-type': 'application/json' },
  });
  check('webhook without signature is 401', missingSignature.status === 401, String(missingSignature.status));
  check('rejected webhooks queue nothing', (await db.collection('whatsAppInboundJobs').countDocuments()) === 0);

  // Status callbacks are ignored
  const statusPayload = buildWebhookPayload([]);
  statusPayload.entry[0].changes[0].value.statuses = [{ id: 'wamid.status', status: 'delivered', recipient_id: phoneA }];
  delete statusPayload.entry[0].changes[0].value.messages;
  const statusResponse = await postWhatsAppPayload(statusPayload);
  check('status callback returns 200 and queues nothing', statusResponse.status === 200 && (await db.collection('whatsAppInboundJobs').countDocuments()) === 0);

  // First contact: consent notice, then the answer
  const first = await sendTextAndWait(phoneA, 'What is the difference between bail and anticipatory bail?');
  check('signed webhook returns 200', first.response.status === 200, String(first.response.status));
  const firstTexts = textsSentTo(phoneA);
  check('first contact gets the privacy notice first', firstTexts[0]?.includes('Welcome to LexBridge') && firstTexts[0]?.includes('https://lexbridge.example/legal/privacy'), firstTexts[0]);
  check('first contact then gets the AI answer', firstTexts[1] === DEFAULT_REPLY.reply, firstTexts[1]);
  check('replies use the bearer token', mock.sentMessages[0]?.authorization === 'Bearer test-whatsapp-token');
  check('typing indicator sent for AI answers', mock.readReceipts.some((receipt) => receipt.typing_indicator?.type === 'text'));
  let contactA = await findContact(phoneA);
  check('first question uses 1 free question', contactA.FreeMessagesUsed === 1 && contactA.ProfileName === 'Test Person', JSON.stringify(contactA));

  const claudeRequest = mock.anthropicRequests[0];
  check('Claude request uses claude-opus-5, low effort and default fallbacks',
    claudeRequest?.body.model === 'claude-opus-5' && claudeRequest?.body.output_config?.effort === 'low' && claudeRequest?.body.fallbacks === 'default',
    JSON.stringify(claudeRequest?.body).slice(0, 300));
  check('Claude request sends the fallback beta header', String(claudeRequest?.headers['anthropic-beta'] ?? '').includes('server-side-fallback-2026-07-01'));
  check('system prompt is marked for caching', claudeRequest?.body.system?.[0]?.cache_control?.type === 'ephemeral');
  check('user text is wrapped as untrusted input', String(claudeRequest?.body.messages?.at(-1)?.content).includes('<user_message>'));

  // Duplicate delivery of the same message id
  const callsBeforeDuplicate = mock.anthropicRequests.length;
  const sentBeforeDuplicate = mock.sentMessages.length;
  const duplicate = await postWhatsAppPayload(buildWebhookPayload([first.message]));
  await sleep(400);
  await waitForJobsIdle('duplicate');
  check('duplicate delivery returns 200', duplicate.status === 200);
  check('duplicate delivery is not processed again',
    mock.anthropicRequests.length === callsBeforeDuplicate && mock.sentMessages.length === sentBeforeDuplicate
      && (await db.collection('whatsAppInboundJobs').countDocuments({ WaMessageId: first.message.id })) === 1);

  // Four more free questions sent at once
  const burst = ['Question two about bail', 'Question three about FIR', 'Question four about notices', 'Question five about rent'].map(
    (text) => buildInboundMessage({ phone: phoneA, text }),
  );
  await Promise.all(burst.map((message) => postWhatsAppPayload(buildWebhookPayload([message]))));
  await sleep(100);
  await waitForJobsIdle('burst');
  contactA = await findContact(phoneA);
  check('five free questions used after burst', contactA.FreeMessagesUsed === 5, String(contactA.FreeMessagesUsed));
  check('AI called once per free question', mock.anthropicRequests.length === callsBeforeDuplicate + 4, String(mock.anthropicRequests.length));
  check('privacy notice sent only once', textsSentTo(phoneA).filter((text) => text.includes('Welcome to LexBridge')).length === 1);
  check('later AI requests include earlier conversation', (mock.anthropicRequests.at(-1)?.body.messages?.length ?? 0) > 1);

  // Sixth question: payment link instead of an AI call
  const callsBeforePaywall = mock.anthropicRequests.length;
  await sendTextAndWait(phoneA, 'Sixth question: what documents do I need for a rental agreement?');
  const paywallText = lastTextSentTo(phoneA);
  check('6th question gets a payment link', paywallText.includes('https://rzp.io/i/') && paywallText.includes('₹199') && paywallText.includes('30 more'), paywallText);
  check('6th question does not call the AI', mock.anthropicRequests.length === callsBeforePaywall);
  const createdLink = mock.paymentLinks[0];
  check('payment link: 19900 paise INR, reference ≤ 40 chars, Razorpay notifications off',
    createdLink?.body.amount === 19900 && createdLink?.body.currency === 'INR' && createdLink?.body.reference_id.length <= 40
      && createdLink?.body.notify?.sms === false && createdLink?.body.accept_partial === false,
    JSON.stringify(createdLink?.body));
  check('payment link expiry is at least 15 minutes out', createdLink?.body.expire_by - Math.floor(Date.now() / 1000) > 15 * 60);
  check('payment link call uses Basic auth', createdLink?.authorization === `Basic ${Buffer.from('rzp_test_key:rzp_test_secret').toString('base64')}`);

  await sendTextAndWait(phoneA, 'Seventh question while unpaid');
  check('unpaid link is reused, not duplicated', mock.paymentLinks.length === 1 && lastTextSentTo(phoneA).includes(createdLink.id));

  await sendTextAndWait(phoneA, 'BALANCE');
  check('BALANCE is free and shows no questions left', lastTextSentTo(phoneA).includes('no questions left') && (await findContact(phoneA)).FreeMessagesUsed === 5);

  // Razorpay webhook
  const paidEvent = buildRazorpayEvent(createdLink.id);
  const badRazorpay = await postRazorpayEvent(paidEvent, { signature: 'f'.repeat(64) });
  check('Razorpay webhook with bad signature is 401', badRazorpay.status === 401);
  check('bad Razorpay signature credits nothing', (await findContact(phoneA)).PaidMessagesRemaining === 0);

  const paid = await postRazorpayEvent(paidEvent, { eventId: 'evt_paid_1' });
  contactA = await findContact(phoneA);
  check('payment_link.paid credits 30 questions', paid.status === 200 && paid.json?.outcome === 'credited' && contactA.PaidMessagesRemaining === 30, `${paid.status} ${paid.text}`);
  const paymentRecord = await db.collection('whatsAppPayments').findOne({ RazorpayPaymentLinkId: createdLink.id });
  check('payment marked paid with Razorpay payment id', paymentRecord?.Status === 'paid' && paymentRecord?.RazorpayPaymentId?.startsWith('pay_'));
  check('payment confirmation sent on WhatsApp', lastTextSentTo(phoneA).includes('30 questions have been added'), lastTextSentTo(phoneA));

  const replay = await postRazorpayEvent(paidEvent, { eventId: 'evt_paid_1' });
  check('replayed event id is skipped', replay.json?.outcome === 'duplicate' && (await findContact(phoneA)).PaidMessagesRemaining === 30, replay.text);
  const redelivered = await postRazorpayEvent(paidEvent, { eventId: 'evt_paid_2' });
  check('same payment under a new event id is not credited twice', redelivered.json?.outcome === 'already-credited' && (await findContact(phoneA)).PaidMessagesRemaining === 30, redelivered.text);

  await sendTextAndWait(phoneA, 'Paid question about consumer complaints');
  check('paid question gets an AI answer and uses 1 paid question', lastTextSentTo(phoneA) === DEFAULT_REPLY.reply && (await findContact(phoneA)).PaidMessagesRemaining === 29);

  // AI failure refunds the question
  mock.anthropicMode = 'error';
  const failing = await sendTextAndWait(phoneA, 'This one will fail at the AI');
  mock.anthropicMode = 'ok';
  const failedInbound = await db.collection('whatsAppMessages').findOne({ WaMessageId: failing.message.id });
  check('AI failure sends an apology', lastTextSentTo(phoneA).includes("couldn't answer just now"), lastTextSentTo(phoneA));
  check('AI failure refunds the question', (await findContact(phoneA)).PaidMessagesRemaining === 29 && failedInbound?.ChargeType === 'refunded', JSON.stringify(failedInbound));

  // Refusal refunds the question
  mock.anthropicMode = 'refusal';
  await sendTextAndWait(phoneA, 'This one the model declines');
  mock.anthropicMode = 'ok';
  check('refusal is refunded and explained', lastTextSentTo(phoneA).includes("can't help with that message") && (await findContact(phoneA)).PaidMessagesRemaining === 29);

  // Human handoff by command
  const requestsBefore = await db.collection('serviceRequests').countDocuments();
  await sendTextAndWait(phoneA, 'HUMAN');
  const handoffText = lastTextSentTo(phoneA);
  const handoffRequest = await db.collection('serviceRequests').findOne({ Source: 'whatsapp-agent', Phone: `+${phoneA}` });
  check('HUMAN creates a ServiceRequest and shares the reference',
    handoffRequest && handoffText.includes(handoffRequest.ReferenceCode) && (await db.collection('serviceRequests').countDocuments()) === requestsBefore + 1,
    handoffText);
  check('handoff request keeps phone, empty email and recent questions',
    handoffRequest?.Email === '' && handoffRequest?.PhoneLast10 === phoneA.slice(-10) && handoffRequest?.Description.includes('Question two about bail'));
  check('HUMAN does not use a question', (await findContact(phoneA)).PaidMessagesRemaining === 29);
  await sendTextAndWait(phoneA, 'talk to a lawyer');
  check('second handoff reuses the open request', lastTextSentTo(phoneA).includes('already with the LexBridge team') && (await db.collection('serviceRequests').countDocuments()) === requestsBefore + 1);

  // STOP / START
  await sendTextAndWait(phoneA, 'STOP');
  check('STOP confirms opt-out', lastTextSentTo(phoneA).includes("You've opted out") && (await findContact(phoneA)).IsOptedOut === true);
  const sentBeforeOptedOutQuestion = textsSentTo(phoneA).length;
  const callsBeforeOptedOutQuestion = mock.anthropicRequests.length;
  await sendTextAndWait(phoneA, 'A question while opted out');
  check('opted-out number gets no reply, AI call or charge',
    textsSentTo(phoneA).length === sentBeforeOptedOutQuestion && mock.anthropicRequests.length === callsBeforeOptedOutQuestion
      && (await findContact(phoneA)).PaidMessagesRemaining === 29);
  await sendTextAndWait(phoneA, 'START');
  check('START turns replies back on', lastTextSentTo(phoneA).includes('on again') && (await findContact(phoneA)).IsOptedOut === false, lastTextSentTo(phoneA));
  await sendTextAndWait(phoneA, 'Back again with a question');
  check('question after START is answered', lastTextSentTo(phoneA) === DEFAULT_REPLY.reply && (await findContact(phoneA)).PaidMessagesRemaining === 28);

  // AI-detected handoff on a new number
  mock.nextReply = {
    reply: 'A legal notice usually has a deadline, so it helps to have it reviewed soon.',
    suggestedCategory: 'civil-property',
    needsHumanHandoff: true,
    handoffSummary: 'The person received a legal notice from their landlord demanding they vacate within 15 days.',
  };
  await sendTextAndWait(phoneB, 'My landlord sent me a legal notice to vacate in 15 days');
  mock.nextReply = DEFAULT_REPLY;
  const aiHandoff = await db.collection('serviceRequests').findOne({ Source: 'whatsapp-agent', Phone: `+${phoneB}` });
  check('AI-detected handoff creates a request with the AI summary and category',
    aiHandoff?.ServiceCategory === 'civil-property' && aiHandoff?.Description.includes('vacate within 15 days'), JSON.stringify(aiHandoff));
  check('AI-detected handoff reply includes the reference', lastTextSentTo(phoneB).includes(aiHandoff?.ReferenceCode ?? 'missing'), lastTextSentTo(phoneB));

  await sendTextAndWait(phoneB, '', { type: 'image' });
  check('non-text message gets a text-only note and is free',
    lastTextSentTo(phoneB).includes('only read text messages') && (await findContact(phoneB)).FreeMessagesUsed === 1, lastTextSentTo(phoneB));

  // Concurrency: two messages, one question left
  await sendTextAndWait(phoneC, 'Opening question for C');
  await db.collection('whatsAppContacts').updateOne({ Phone: phoneC }, { $set: { FreeMessagesUsed: 4, PaidMessagesRemaining: 0 } });
  const callsBeforeRace = mock.anthropicRequests.length;
  const linksBeforeRace = mock.paymentLinks.length;
  const sentBeforeRace = textsSentTo(phoneC).length;
  mock.anthropicDelayMs = 400;
  await postWhatsAppPayload(buildWebhookPayload([
    buildInboundMessage({ phone: phoneC, text: 'Racing question one' }),
    buildInboundMessage({ phone: phoneC, text: 'Racing question two' }),
  ]));
  await sleep(100);
  await waitForJobsIdle('race');
  mock.anthropicDelayMs = 0;
  const raceReplies = textsSentTo(phoneC).slice(sentBeforeRace);
  check('concurrent messages spend the last question only once',
    (await findContact(phoneC)).FreeMessagesUsed === 5 && mock.anthropicRequests.length === callsBeforeRace + 1,
    `used=${(await findContact(phoneC)).FreeMessagesUsed} calls=${mock.anthropicRequests.length - callsBeforeRace}`);
  check('concurrent messages: one answer then one payment link, in order',
    raceReplies.length === 2 && raceReplies[0] === DEFAULT_REPLY.reply && raceReplies[1].includes('rzp.io') && mock.paymentLinks.length === linksBeforeRace + 1,
    JSON.stringify(raceReplies));

  return { phoneA };
}

async function runAdminTests({ phoneA }) {
  const adminCookie = await createUserSession({ email: 'admin@test.local', role: 'admin' });
  const clientCookie = await createUserSession({ email: 'client@test.local', role: 'client' });

  check('admin WhatsApp list without session is 401', (await api('/api/admin/whatsapp/contacts')).status === 401);
  check('admin WhatsApp list for a client is 403', (await api('/api/admin/whatsapp/contacts', { cookie: clientCookie })).status === 403);
  check('admin payments list for a client is 403', (await api('/api/admin/whatsapp/payments', { cookie: clientCookie })).status === 403);

  const status = await api('/api/admin/whatsapp/status', { cookie: adminCookie });
  check('admin status reports configured plan', status.json?.isWhatsAppConfigured === true && status.json?.plan?.packPricePaise === 19900, status.text);

  const list = await api('/api/admin/whatsapp/contacts', { cookie: adminCookie });
  check('admin contact list returns contacts with balances', list.status === 200 && list.json.total === 3 && typeof list.json.items[0].FreeMessagesRemaining === 'number', list.text.slice(0, 200));
  const search = await api(`/api/admin/whatsapp/contacts?q=${phoneA.slice(-10)}`, { cookie: adminCookie });
  check('admin search by phone finds one contact', search.json?.total === 1 && search.json.items[0].Phone === phoneA, search.text.slice(0, 200));
  const nameSearch = await api('/api/admin/whatsapp/contacts?q=Test', { cookie: adminCookie });
  check('admin search by name prefix works', nameSearch.json?.total === 3, nameSearch.text.slice(0, 120));

  const contactId = search.json.items[0]._id;
  const detail = await api(`/api/admin/whatsapp/contacts/${contactId}?limit=10`, { cookie: adminCookie });
  check('admin detail has messages page and payments',
    detail.status === 200 && detail.json.messages.items.length === 10 && detail.json.messages.total > 10 && detail.json.payments.length === 1,
    detail.text.slice(0, 200));
  check('admin detail hides internal fields', !('AppliedPaymentLinkIds' in detail.json.contact) && !('processingLockedUntil' in detail.json.contact));

  const grant = await api(`/api/admin/whatsapp/contacts/${contactId}/credits`, { method: 'POST', cookie: adminCookie, body: { Messages: 10, Reason: 'Goodwill after a delayed reply' } });
  check('admin can grant questions', grant.status === 201 && grant.json.contact.PaidMessagesRemaining === 38 && grant.json.contact.CreditGrants.length === 1, grant.text.slice(0, 200));
  const badGrant = await api(`/api/admin/whatsapp/contacts/${contactId}/credits`, { method: 'POST', cookie: adminCookie, body: { Messages: 0, Reason: '' } });
  check('invalid grant is 400', badGrant.status === 400);
  const clientGrant = await api(`/api/admin/whatsapp/contacts/${contactId}/credits`, { method: 'POST', cookie: clientCookie, body: { Messages: 5, Reason: 'Trying' } });
  check('client cannot grant questions', clientGrant.status === 403);

  const payments = await api('/api/admin/whatsapp/payments?status=paid', { cookie: adminCookie });
  check('admin payments list filters by status', payments.json?.total === 1 && payments.json.items[0].Contact?.Phone === phoneA, payments.text.slice(0, 200));

  const handoff = await api('/api/admin/service-requests?q=%2B91', { cookie: adminCookie });
  check('WhatsApp handoff requests appear in the admin request list', (await api('/api/admin/service-requests?limit=50', { cookie: adminCookie })).json?.items.some((item) => item.Source === 'whatsapp-agent'), handoff.text.slice(0, 120));

  return { adminCookie };
}

async function runRegressionTests({ adminCookie }) {
  // Service request from the website still requires an email
  const noEmail = await api('/api/service-requests', { method: 'POST', body: { FullName: 'Web Person', Phone: '9876543210', ServiceCategory: 'other', Description: 'A website request without an email address.', ConsentGiven: true } });
  check('website request without email is still rejected', noEmail.status === 400);
  const webRequest = await api('/api/service-requests', { method: 'POST', body: { FullName: 'Web Person', Email: 'web.person@test.local', Phone: '9876543210', ServiceCategory: 'consumer-matters', Description: 'The seller refuses to replace a faulty washing machine.', ConsentGiven: true } });
  check('website service request still works', webRequest.status === 201 && webRequest.json?.ReferenceCode?.startsWith('LB-'), webRequest.text);

  // OTP sign-in flow
  const email = 'otp.person@test.local';
  const requestOtp = await api('/api/auth/request-otp', { method: 'POST', body: { Email: email } });
  await sleep(300);
  const codeMatch = apiOutput.match(new RegExp(`to=${email.replace('.', '\\.')} subject="Your LexBridge sign-in code"[\\s\\S]*?code is (\\d{6})`));
  const verify = await api('/api/auth/verify-otp', { method: 'POST', body: { Email: email, Code: codeMatch?.[1] ?? '000000' } });
  const cookie = (verify.headers.get('set-cookie') ?? '').split(';')[0];
  const me = await api('/api/auth/me', { cookie });
  check('OTP sign-in still works', requestOtp.status === 200 && verify.status === 200 && me.json?.user?.Email === email, `${requestOtp.status} ${verify.status} ${me.status}`);

  // Booking + double booking
  const tomorrowIst = new Date(Date.now() + 5.5 * 3600e3 + 86400e3).toISOString().slice(0, 10);
  const slots = await api('/api/admin/slots', { method: 'POST', cookie: adminCookie, body: { Date: tomorrowIst, StartTimes: ['10:00'], DurationMinutes: 30 } });
  const openSlots = await api('/api/consultations/slots');
  const slotId = openSlots.json?.slots?.[0]?._id;
  const booking = { SlotId: slotId, ConsultationType: 'quick', Mode: 'phone', Phone: '+91 98765 43210', Description: 'I need help reviewing a rental agreement with my landlord.', ConsentGiven: true };
  const booked = await api('/api/consultations', { method: 'POST', cookie, body: booking });
  const doubleBooked = await api('/api/consultations', { method: 'POST', cookie, body: booking });
  check('booking still works and double booking is 409', slots.status === 201 && booked.status === 201 && doubleBooked.status === 409, `${slots.status} ${booked.status} ${doubleBooked.status}`);

  // Upload + download
  const pdfBytes = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1024, 32)]);
  const form = new FormData();
  form.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'notice.pdf');
  const upload = await api('/api/documents', { method: 'POST', cookie, body: form });
  const download = await api(`/api/documents/${upload.json?.document?._id}/download`, { cookie });
  check('document upload and download still work', upload.status === 201 && download.status === 200 && Buffer.compare(download.buffer, pdfBytes) === 0, `${upload.status} ${download.status}`);
}

async function runDisabledTests() {
  const child = startApi({ port: DISABLED_API_PORT, dbName: DISABLED_DB_NAME, isConfigured: false });
  try {
    await waitForApi(DISABLED_API_PORT);
    const disabledApi = (pathname, options) => callApi(DISABLED_API_PORT, pathname, options);
    const verify = await disabledApi(`/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=1`);
    const raw = JSON.stringify(buildWebhookPayload([buildInboundMessage({ phone: '919876500009', text: 'hello' })]));
    const inbound = await disabledApi('/api/webhooks/whatsapp', { method: 'POST', rawBody: raw, headers: { 'content-type': 'application/json' } });
    const razorpay = await disabledApi('/api/webhooks/razorpay', { method: 'POST', rawBody: '{}', headers: { 'content-type': 'application/json' } });
    const disabledDb = mongoose.connection.useDb(DISABLED_DB_NAME);
    const queued = await disabledDb.collection('whatsAppInboundJobs').countDocuments();
    check('unconfigured: verification is 403, webhooks return 200 and queue nothing',
      verify.status === 403 && inbound.status === 200 && razorpay.status === 200 && queued === 0,
      `${verify.status} ${inbound.status} ${razorpay.status} ${queued}`);
  } finally {
    child.kill();
    await mongoose.connection.useDb(DISABLED_DB_NAME).dropDatabase();
  }
}

async function main() {
  await new Promise((resolve) => { mockServer.listen(MOCK_PORT, '127.0.0.1', resolve); });
  await mongoose.connect(`${MONGO_BASE_URI}/${DB_NAME}`);
  db = mongoose.connection.db;
  await db.dropDatabase();

  const apiProcess = startApi({ port: API_PORT, dbName: DB_NAME, isConfigured: true });
  let exitCode = 0;
  try {
    await waitForApi(API_PORT);
    await waitForIndexes();
    const whatsAppContext = await runWhatsAppTests();
    const adminContext = await runAdminTests(whatsAppContext);
    await runRegressionTests(adminContext);
    await runDisabledTests();
  } catch (err) {
    exitCode = 1;
    console.error('Test run crashed:', err);
    console.error(apiOutput.slice(-4000));
  } finally {
    apiProcess.kill();
    await db.dropDatabase();
    await mongoose.disconnect();
    mockServer.close();
  }

  const failed = results.filter((result) => !result.passed);
  const errorLines = apiOutput.split('\n').filter((line) => /"level":(50|60)/.test(line));
  console.log(`\nRESULT: ${results.length - failed.length} passed, ${failed.length} failed`);
  console.log(`API error-level log lines: ${errorLines.length}`);
  errorLines.slice(0, 5).forEach((line) => console.log(`  ${line.slice(0, 300)}`));
  process.exit(failed.length > 0 ? 1 : exitCode);
}

main();
