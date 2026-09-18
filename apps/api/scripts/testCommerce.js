/*
  End-to-end test for the service catalogue, checkout, coupons, refunds, AI document review, callbacks,
  public stats and feature flags. Runs against throwaway databases with mocked Razorpay and Anthropic
  endpoints (no real external calls).
  Usage (needs a local MongoDB): pnpm --filter @lexbridge/api test:commerce
*/
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const API_PORT = 5059;
// Not 5060/5061: fetch refuses those "bad ports" (SIP)
const FLAGS_OFF_API_PORT = 5064;
const MOCK_PORT = 5099;
const MONGO_BASE_URI = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'lexbridge_commerce';
const FLAGS_OFF_DB_NAME = 'lexbridge_commerce_flags_off';
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
const RAZORPAY_KEY_ID = 'rzp_test_commerce';
const RAZORPAY_KEY_SECRET = 'rzp-test-key-secret';
const RAZORPAY_WEBHOOK_SECRET = 'rzp-test-webhook-secret';
const ADMIN_ALERT_EMAIL = 'ops@lexbridge.test';
const CLIENT_EMAIL = 'priya@lexbridge.test';
const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lexbridge-commerce-'));

const PRODUCT_A = 'rent-agreement-drafting';
const PRODUCT_B = 'trademark-filing';

const results = [];
function check(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}${condition || !detail ? '' : ` — ${detail}`}`);
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const randomHex = (bytes = 7) => crypto.randomBytes(bytes).toString('hex');
const signHex = (secret, value) => crypto.createHmac('sha256', secret).update(value).digest('hex');

// ---------- Mock Razorpay and Anthropic ----------
const REVIEW_REPORT = {
  isLegalDocument: true,
  documentType: 'Residential rental agreement',
  plainSummary: 'An 11-month lease of a flat in Pune between the owner and the tenant, with rent, deposit and lock-in terms.',
  keyObligations: [{ party: 'Tenant', obligation: 'Pay rent by the 5th of each month.' }],
  risks: [{ title: 'Deposit refund has no deadline', explanation: 'The owner can hold the deposit indefinitely.', severity: 'high' }],
  missingOrUnusualClauses: [{ clause: 'Deposit refund timeline', whyItMatters: 'Without it, recovering the deposit is harder.' }],
  questionsForLawyer: ['Can a refund deadline for the deposit be added?'],
  overallRisk: 'moderate',
  overallRiskReason: 'Mostly standard terms, but the deposit clause favours the owner.',
};

const mock = {
  orders: [],
  refunds: [],
  anthropicRequests: [],
  anthropicMode: 'ok',
  refundStatus: 'pending',
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

  if (req.method === 'POST' && pathname === '/v1/orders') {
    const body = JSON.parse(rawBody);
    const id = `order_${randomHex()}`;
    mock.orders.push({ id, body, authorization: req.headers.authorization });
    return sendJson(res, 200, { id, entity: 'order', amount: body.amount, currency: body.currency, receipt: body.receipt, status: 'created' });
  }

  const refundMatch = pathname.match(/^\/v1\/payments\/([^/]+)\/refund$/);
  if (req.method === 'POST' && refundMatch) {
    const body = JSON.parse(rawBody);
    const id = `rfnd_${randomHex()}`;
    mock.refunds.push({ id, paymentId: refundMatch[1], body });
    return sendJson(res, 200, { id, entity: 'refund', amount: body.amount, payment_id: refundMatch[1], status: mock.refundStatus });
  }

  if (req.method === 'POST' && pathname.startsWith('/v1/messages')) {
    mock.anthropicRequests.push({ body: JSON.parse(rawBody) });
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
        usage: { input_tokens: 2100, output_tokens: 0 },
      });
    }
    return sendJson(res, 200, {
      ...baseMessage,
      content: [{ type: 'text', text: JSON.stringify(REVIEW_REPORT) }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 5400, output_tokens: 700 },
    });
  }

  sendJson(res, 404, { error: `mock: no route for ${req.method} ${pathname}` });
});

// ---------- API processes ----------
let apiOutput = '';

function startApi({ port, dbName, extraEnv = {} }) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(ANTHROPIC_|WHATSAPP_|RAZORPAY_|MONGO_|SMTP_|S3_|DOCUMENT_REVIEW_|ADMIN_EMAILS|PUBLIC_SITE_URL|FEATURE_FLAGS_OVERRIDE|UPLOAD_DIR|STORAGE_DRIVER|CALLBACK_)/.test(key)) {
      delete env[key];
    }
  }
  Object.assign(env, {
    NODE_ENV: 'test',
    PORT: String(port),
    MONGO_URI: `${MONGO_BASE_URI}/${dbName}`,
    JWT_SECRET,
    LOG_LEVEL: 'warn',
    NOTIFICATION_WORKER_ENABLED: 'false',
    WHATSAPP_INBOUND_WORKER_ENABLED: 'false',
    DOCUMENT_REVIEW_POLL_INTERVAL_MS: '150',
    DOCUMENT_REVIEW_DAILY_LIMIT: '3',
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_API_BASE_URL: `http://127.0.0.1:${MOCK_PORT}`,
    ADMIN_EMAILS: ADMIN_ALERT_EMAIL,
    STORAGE_DRIVER: 'local',
    UPLOAD_DIR,
    ...extraEnv,
  });

  const child = spawn(process.execPath, ['src/server.js'], { cwd: API_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  const collectOutput = (chunk) => {
    const text = chunk.toString();
    child.output += text;
    apiOutput += text;
  };
  child.stdout.on('data', collectOutput);
  child.stderr.on('data', collectOutput);
  return child;
}

function stopApi(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  });
}

async function waitForApi(port, child) {
  let lastResult = 'no response';
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/ready`);
      if (response.ok) return;
      lastResult = `HTTP ${response.status} ${await response.text()}`;
    } catch (err) {
      lastResult = err.cause?.code ?? err.message;
    }
    await sleep(200);
  }
  throw new Error(`API on port ${port} did not become ready (exit code ${child.exitCode}, last: ${lastResult})\nAPI output:\n${child.output.slice(-3000)}`);
}

async function callApi(port, pathname, { method = 'GET', body, rawBody, headers = {}, cookie } = {}) {
  const requestHeaders = { ...headers };
  if (cookie) requestHeaders.cookie = cookie;
  let requestBody = rawBody;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    requestHeaders['content-type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { method, headers: requestHeaders, body: requestBody });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status, text, json };
}

const api = (pathname, options) => callApi(API_PORT, pathname, options);

// ---------- Helpers ----------
let db;

async function createUser(database, { email, role = 'client', fullName }) {
  const now = new Date();
  const { insertedId } = await database.collection('users').insertOne({ FullName: fullName, Email: email, Phone: '', Role: role, createdAt: now, updatedAt: now });
  const token = jwt.sign({ email }, JWT_SECRET, { subject: String(insertedId), expiresIn: '1h' });
  return { id: String(insertedId), email, cookie: `lexbridge_session=${token}` };
}

async function waitForIndexes(database) {
  const expected = [['orders', 'RazorpayOrderId_1'], ['coupons', 'Code_1'], ['products', 'Slug_1'], ['documentReviews', 'ReferenceCode_1']];
  for (let attempt = 0; attempt < 75; attempt++) {
    const found = await Promise.all(expected.map(async ([collection, indexName]) => {
      try {
        return (await database.collection(collection).indexes()).some((index) => index.name === indexName);
      } catch {
        return false;
      }
    }));
    if (found.every(Boolean)) return;
    await sleep(200);
  }
  throw new Error('Indexes were not built in time');
}

function buildOrderBody(overrides = {}) {
  return {
    Items: [{ Slug: PRODUCT_A }],
    FullName: 'Priya Sharma',
    Email: CLIENT_EMAIL,
    Phone: '+91 98765 43210',
    Description: 'Two-bedroom flat in Pune, 11-month term.',
    PreferredLanguage: 'hi',
    WhatsAppOptIn: true,
    ConsentGiven: true,
    ...overrides,
  };
}

function verifyPayment(razorpayOrderId, { paymentId = `pay_${randomHex()}`, signature } = {}) {
  return api('/api/checkout/verify', {
    method: 'POST',
    body: {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature ?? signHex(RAZORPAY_KEY_SECRET, `${razorpayOrderId}|${paymentId}`),
    },
  });
}

function buildPaymentEvent(eventName, { razorpayOrderId, amount, paymentId = `pay_${randomHex()}` }) {
  return {
    entity: 'event',
    account_id: 'acc_test',
    event: eventName,
    contains: ['payment'],
    payload: {
      payment: {
        entity: {
          id: paymentId,
          entity: 'payment',
          amount,
          currency: 'INR',
          status: eventName === 'payment.failed' ? 'failed' : 'captured',
          order_id: razorpayOrderId,
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}

function buildRefundEvent(eventName, { refundId, paymentId, amount }) {
  return {
    entity: 'event',
    account_id: 'acc_test',
    event: eventName,
    contains: ['refund', 'payment'],
    payload: { refund: { entity: { id: refundId, entity: 'refund', amount, payment_id: paymentId, status: 'processed' } } },
    created_at: Math.floor(Date.now() / 1000),
  };
}

function postRazorpayEvent(event, { eventId = `evt_${randomHex()}`, signature, port = API_PORT } = {}) {
  const raw = JSON.stringify(event);
  return callApi(port, '/api/webhooks/razorpay', {
    method: 'POST',
    rawBody: raw,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature ?? signHex(RAZORPAY_WEBHOOK_SECRET, raw),
      'x-razorpay-event-id': eventId,
    },
  });
}

const findOrder = (referenceCode) => db.collection('orders').findOne({ ReferenceCode: referenceCode });
const findCoupon = (code) => db.collection('coupons').findOne({ Code: code });
const countJobs = (eventName) => db.collection('notificationJobs').countDocuments({ EventName: eventName });

function buildPdf(pageCount = 1) {
  const pages = Array.from({ length: pageCount }, (_, index) => `${index + 3} 0 obj << /Type /Page /Parent 2 0 R >> endobj\n`).join('');
  return Buffer.from(`%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Count ${pageCount} >> endobj\n${pages}%%EOF\n`, 'latin1');
}

function uploadForReview(cookie, bytes = buildPdf(), { type = 'application/pdf', name = 'lease.pdf' } = {}) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  return api('/api/document-reviews', { method: 'POST', cookie, body: form });
}

async function waitForReview(referenceCode, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const review = await db.collection('documentReviews').findOne({ ReferenceCode: referenceCode });
    if (review && ['completed', 'failed'].includes(review.Status)) return review;
    await sleep(100);
  }
  return db.collection('documentReviews').findOne({ ReferenceCode: referenceCode });
}

// ---------- Catalogue ----------
async function runCatalogTests({ admin, client }) {
  const productA = await api('/api/admin/products', {
    method: 'POST',
    cookie: admin.cookie,
    body: {
      Title: 'Rent agreement drafting',
      Slug: PRODUCT_A,
      Category: 'documents',
      ServiceCategory: 'legal-drafting',
      Summary: 'A rent agreement drafted for your terms.',
      Inclusions: ['Drafting', 'One revision'],
      DocumentsRequired: ['Identity proof of both parties'],
      TurnaroundText: '1–2 working days',
      PricePaise: 49900,
      FaqItems: [{ Question: 'Is stamp paper included?', Answer: 'No, it is charged separately.' }],
    },
  });
  check('admin creates an unpublished product', productA.status === 201 && productA.json?.product?.IsPublished === false, `${productA.status} ${productA.text.slice(0, 200)}`);

  const productB = await api('/api/admin/products', {
    method: 'POST',
    cookie: admin.cookie,
    body: { Title: 'Trademark filing', Slug: PRODUCT_B, Category: 'business', ServiceCategory: 'business-corporate', PricePaise: 699900, IsPublished: true, SortOrder: 1 },
  });
  const productC = await api('/api/admin/products', {
    method: 'POST',
    cookie: admin.cookie,
    body: { Title: 'Temporary service', Category: 'personal', ServiceCategory: 'other', PricePaise: 1000 },
  });
  check('admin creates a published product and derives a slug', productB.status === 201 && productC.json?.product?.Slug === 'temporary-service', `${productB.status} ${productC.text.slice(0, 120)}`);

  const duplicate = await api('/api/admin/products', {
    method: 'POST',
    cookie: admin.cookie,
    body: { Title: 'Duplicate', Slug: PRODUCT_A, Category: 'documents', ServiceCategory: 'legal-drafting', PricePaise: 100 },
  });
  const fractionalPrice = await api('/api/admin/products', {
    method: 'POST',
    cookie: admin.cookie,
    body: { Title: 'Bad price', Category: 'documents', ServiceCategory: 'legal-drafting', PricePaise: 10.5 },
  });
  check('duplicate slug is 409 and fractional paise is 400', duplicate.status === 409 && fractionalPrice.status === 400, `${duplicate.status} ${fractionalPrice.status}`);

  const asClient = await api('/api/admin/products', { method: 'POST', cookie: client.cookie, body: {} });
  const signedOut = await api('/api/admin/products');
  check('admin product API is 403 for clients and 401 signed out', asClient.status === 403 && signedOut.status === 401, `${asClient.status} ${signedOut.status}`);

  const publicList = await api('/api/products');
  const publicSlugs = (publicList.json?.products ?? []).map((product) => product.Slug);
  check('public list shows only published products', publicSlugs.includes(PRODUCT_B) && !publicSlugs.includes(PRODUCT_A), JSON.stringify(publicSlugs));

  const hiddenDetail = await api(`/api/products/${PRODUCT_A}`);
  const publish = await api(`/api/admin/products/${productA.json.product._id}`, { method: 'PATCH', cookie: admin.cookie, body: { IsPublished: true } });
  const visibleDetail = await api(`/api/products/${PRODUCT_A}`);
  check('unpublished detail is 404 until published',
    hiddenDetail.status === 404 && publish.status === 200 && visibleDetail.status === 200 && visibleDetail.json?.product?.DocumentsRequired?.length === 1 && visibleDetail.json?.product?.FaqItems?.length === 1,
    `${hiddenDetail.status} ${publish.status} ${visibleDetail.status}`);

  const businessList = await api('/api/products?category=business');
  check('public list filters by category', businessList.json?.products?.length === 1 && businessList.json.products[0].Slug === PRODUCT_B, businessList.text.slice(0, 200));

  const removed = await api(`/api/admin/products/${productC.json.product._id}`, { method: 'DELETE', cookie: admin.cookie });
  check('admin deletes an unused product', removed.status === 200, String(removed.status));
  return { productAId: productA.json.product._id };
}

// ---------- Coupons ----------
async function createCoupon(admin, body) {
  return api('/api/admin/coupons', { method: 'POST', cookie: admin.cookie, body });
}

async function runCouponTests({ admin }) {
  const created = await Promise.all([
    createCoupon(admin, { Code: 'pct10', Type: 'percent', Value: 10, MaxDiscountPaise: 3000 }),
    createCoupon(admin, { Code: 'FLATDOCS', Type: 'flat', Value: 10000, AppliesToCategories: ['documents'], PerUserLimit: 1 }),
    createCoupon(admin, { Code: 'FREE100', Type: 'percent', Value: 100 }),
    createCoupon(admin, { Code: 'EXPIRED', Type: 'percent', Value: 20, EndsAt: new Date(Date.now() - 60_000).toISOString() }),
    createCoupon(admin, { Code: 'ONEUSE', Type: 'percent', Value: 5, MaxRedemptions: 1 }),
  ]);
  check('admin creates coupons (code normalised to upper case)', created.every((response) => response.status === 201) && created[0].json?.coupon?.Code === 'PCT10', created.map((response) => response.status).join(','));

  const tooHigh = await createCoupon(admin, { Code: 'TOOHIGH', Type: 'percent', Value: 150 });
  const duplicate = await createCoupon(admin, { Code: 'PCT10', Type: 'flat', Value: 100 });
  check('percent over 100 is 400 and duplicate code is 409', tooHigh.status === 400 && duplicate.status === 409, `${tooHigh.status} ${duplicate.status}`);

  const validate = (body) => api('/api/checkout/coupons/validate', { method: 'POST', body });
  const capped = await validate({ Items: [{ Slug: PRODUCT_A }], CouponCode: 'pct10' });
  check('percent coupon respects its maximum discount',
    capped.status === 200 && capped.json?.DiscountPaise === 3000 && capped.json?.TotalPaise === 46900,
    capped.text.slice(0, 200));

  const wrongCategory = await validate({ Items: [{ Slug: PRODUCT_B }], CouponCode: 'FLATDOCS' });
  const expired = await validate({ Items: [{ Slug: PRODUCT_A }], CouponCode: 'EXPIRED' });
  const unknown = await validate({ Items: [{ Slug: PRODUCT_A }], CouponCode: 'NOPE' });
  check('coupon rules: wrong category, expired and unknown codes are 400',
    wrongCategory.status === 400 && expired.status === 400 && unknown.status === 400 && /expired/i.test(expired.json?.error ?? ''),
    `${wrongCategory.status} ${expired.status} ${unknown.status}`);
}

// ---------- Checkout ----------
async function runCheckoutTests({ client }) {
  const ordersBefore = mock.orders.length;
  const tampered = await api('/api/checkout/orders', {
    method: 'POST',
    cookie: client.cookie,
    body: buildOrderBody({ Items: [{ Slug: PRODUCT_A, PricePaise: 1 }], TotalPaise: 100, AmountPaise: 1, PricePaise: 1 }),
  });
  const razorpayOrder = mock.orders.at(-1);
  check('order price comes from the database, not the request',
    tampered.status === 201
      && tampered.json?.order?.TotalPaise === 49900
      && tampered.json?.checkout?.amountPaise === 49900
      && mock.orders.length === ordersBefore + 1
      && razorpayOrder?.body?.amount === 49900
      && razorpayOrder?.body?.receipt === tampered.json?.order?.ReferenceCode,
    `${tampered.status} ${tampered.text.slice(0, 300)}`);
  check('checkout response carries the key id and prefill',
    tampered.json?.checkout?.keyId === RAZORPAY_KEY_ID && tampered.json?.checkout?.prefill?.email === CLIENT_EMAIL && /^LO-/.test(tampered.json?.order?.ReferenceCode ?? ''),
    JSON.stringify(tampered.json?.checkout ?? {}));

  const unavailable = await api('/api/checkout/orders', { method: 'POST', body: buildOrderBody({ Items: [{ Slug: 'no-such-service' }] }) });
  const noConsent = await api('/api/checkout/orders', { method: 'POST', body: buildOrderBody({ ConsentGiven: false }) });
  check('unknown product and missing consent are 400', unavailable.status === 400 && noConsent.status === 400, `${unavailable.status} ${noConsent.status}`);

  const { ReferenceCode: orderReference } = tampered.json.order;
  const razorpayOrderId = tampered.json.checkout.razorpayOrderId;
  const paymentId = `pay_${randomHex()}`;

  const badSignature = await verifyPayment(razorpayOrderId, { paymentId, signature: 'a'.repeat(64) });
  const unknownOrder = await verifyPayment('order_doesnotexist', { paymentId });
  check('verify rejects a bad signature (400) and an unknown order (404)', badSignature.status === 400 && unknownOrder.status === 404, `${badSignature.status} ${unknownOrder.status}`);

  const verified = await verifyPayment(razorpayOrderId, { paymentId });
  const verifiedAgain = await verifyPayment(razorpayOrderId, { paymentId });
  const storedOrder = await findOrder(orderReference);
  const requests = await db.collection('serviceRequests').find({ Source: 'catalog-order', Description: { $regex: orderReference } }).toArray();
  check('verify marks the order paid and creates one service request',
    verified.status === 200
      && verified.json?.order?.Status === 'paid'
      && /^LB-/.test(verified.json?.order?.ServiceRequestReference ?? '')
      && verifiedAgain.status === 200
      && verifiedAgain.json?.order?.ServiceRequestReference === verified.json.order.ServiceRequestReference
      && storedOrder.RazorpayPaymentId === paymentId
      && requests.length === 1
      && requests[0].PreferredLanguage === 'hi'
      && requests[0].ServiceCategory === 'legal-drafting',
    `${verified.status} ${verifiedAgain.status} requests=${requests.length}`);

  const orderPaidJobs = await db.collection('notificationJobs').find({ EventName: 'order-paid' }).toArray();
  check('order-paid email and WhatsApp notifications are queued once',
    orderPaidJobs.length === 2 && orderPaidJobs.some((job) => job.Channel === 'email' && job.Payload.to === CLIENT_EMAIL),
    `jobs=${orderPaidJobs.length}`);

  return { orderReference, paymentId, razorpayOrderId };
}

async function runRedemptionAndWebhookTests({ client, otherClient }) {
  const first = await api('/api/checkout/orders', { method: 'POST', cookie: client.cookie, body: buildOrderBody({ CouponCode: 'ONEUSE' }) });
  const second = await api('/api/checkout/orders', { method: 'POST', cookie: client.cookie, body: buildOrderBody({ CouponCode: 'ONEUSE' }) });
  const afterCreate = await findCoupon('ONEUSE');
  check('coupon redemptions are not counted when checkout starts',
    first.status === 201 && second.status === 201 && afterCreate.RedemptionCount === 0 && second.json.order.DiscountPaise === 2495,
    `${first.status} ${second.status} count=${afterCreate?.RedemptionCount}`);

  const paymentEvent = buildPaymentEvent('payment.captured', { razorpayOrderId: second.json.checkout.razorpayOrderId, amount: second.json.order.TotalPaise });
  const eventId = `evt_${randomHex()}`;
  const applied = await postRazorpayEvent(paymentEvent, { eventId });
  const replayed = await postRazorpayEvent(paymentEvent, { eventId });
  const redelivered = await postRazorpayEvent(paymentEvent);
  const afterPayment = await findCoupon('ONEUSE');
  check('payment webhook pays the order, is deduplicated and redeems the coupon once',
    applied.json?.outcome === 'order-paid' && replayed.json?.outcome === 'duplicate' && redelivered.json?.outcome === 'already-paid' && afterPayment.RedemptionCount === 1,
    `${applied.text} ${replayed.text} ${redelivered.text} count=${afterPayment?.RedemptionCount}`);

  const exhausted = await api('/api/checkout/coupons/validate', { method: 'POST', body: { Items: [{ Slug: PRODUCT_A }], CouponCode: 'ONEUSE' } });
  check('a fully redeemed coupon is rejected', exhausted.status === 400 && /fully used/i.test(exhausted.json?.error ?? ''), exhausted.text);

  const unsigned = await postRazorpayEvent(paymentEvent, { signature: 'b'.repeat(64) });
  check('unsigned Razorpay webhook is 401', unsigned.status === 401, String(unsigned.status));

  const third = await api('/api/checkout/orders', { method: 'POST', body: buildOrderBody({ Email: 'walkin@lexbridge.test' }) });
  const underpaid = await postRazorpayEvent(buildPaymentEvent('payment.captured', { razorpayOrderId: third.json.checkout.razorpayOrderId, amount: 100 }));
  const failed = await postRazorpayEvent(buildPaymentEvent('payment.failed', { razorpayOrderId: third.json.checkout.razorpayOrderId, amount: third.json.order.TotalPaise }));
  const afterFailure = await findOrder(third.json.order.ReferenceCode);
  const retry = await verifyPayment(third.json.checkout.razorpayOrderId);
  check('underpayment is not accepted; a failed payment can be retried',
    underpaid.json?.outcome === 'amount-mismatch' && failed.json?.outcome === 'order-failed' && afterFailure.Status === 'failed' && retry.json?.order?.Status === 'paid',
    `${underpaid.text} ${failed.text} ${afterFailure?.Status} ${retry.status}`);

  const perUser = await api('/api/checkout/orders', { method: 'POST', cookie: client.cookie, body: buildOrderBody({ CouponCode: 'FLATDOCS' }) });
  await verifyPayment(perUser.json.checkout.razorpayOrderId);
  const sameCustomer = await api('/api/checkout/coupons/validate', { method: 'POST', body: { Items: [{ Slug: PRODUCT_A }], CouponCode: 'FLATDOCS', Email: CLIENT_EMAIL } });
  const otherCustomer = await api('/api/checkout/coupons/validate', { method: 'POST', body: { Items: [{ Slug: PRODUCT_A }], CouponCode: 'FLATDOCS', Email: otherClient.email } });
  check('per-customer coupon limit applies after a paid order',
    perUser.json?.order?.DiscountPaise === 10000 && sameCustomer.status === 400 && otherCustomer.status === 200,
    `${perUser.status} ${sameCustomer.status} ${otherCustomer.status}`);
}

async function runFreeOrderTests({ admin }) {
  const ordersBefore = mock.orders.length;
  const free = await api('/api/checkout/orders', { method: 'POST', body: buildOrderBody({ CouponCode: 'FREE100', Email: 'free@lexbridge.test' }) });
  const freeCoupon = await findCoupon('FREE100');
  check('a fully discounted order completes without Razorpay',
    free.status === 201
      && free.json?.order?.Status === 'paid'
      && free.json?.checkout === null
      && /^LB-/.test(free.json?.order?.ServiceRequestReference ?? '')
      && mock.orders.length === ordersBefore
      && freeCoupon.RedemptionCount === 1,
    `${free.status} ${free.text.slice(0, 300)}`);

  const refundFree = await api(`/api/admin/orders/${free.json.order.ReferenceCode}/refunds`, { method: 'POST', cookie: admin.cookie, body: { Reason: 'Test refund' } });
  check('a free order has nothing to refund', refundFree.status === 400, refundFree.text);
}

async function runRefundTests({ admin, client }, { orderReference, paymentId }) {
  const asClient = await api(`/api/admin/orders/${orderReference}/refunds`, { method: 'POST', cookie: client.cookie, body: { Reason: 'nope' } });
  check('clients cannot refund orders', asClient.status === 403, String(asClient.status));

  const partial = await api(`/api/admin/orders/${orderReference}/refunds`, { method: 'POST', cookie: admin.cookie, body: { AmountPaise: 10000, Reason: 'Scope reduced' } });
  const razorpayRefund = mock.refunds.at(-1);
  check('partial refund calls Razorpay and updates the order',
    partial.status === 200
      && partial.json?.order?.Status === 'partially-refunded'
      && partial.json?.order?.RefundedPaise === 10000
      && razorpayRefund?.paymentId === paymentId
      && razorpayRefund?.body?.amount === 10000,
    `${partial.status} ${partial.text.slice(0, 200)}`);

  const tooMuch = await api(`/api/admin/orders/${orderReference}/refunds`, { method: 'POST', cookie: admin.cookie, body: { AmountPaise: 9_999_999, Reason: 'Too much' } });
  check('refunding more than was paid is 400', tooMuch.status === 400, tooMuch.text);

  const processed = await postRazorpayEvent(buildRefundEvent('refund.processed', { refundId: razorpayRefund.id, paymentId, amount: 10000 }));
  const afterWebhook = await findOrder(orderReference);
  check('refund.processed webhook updates the refund status',
    processed.json?.outcome === 'refund-updated' && afterWebhook.Refunds[0].Status === 'processed',
    `${processed.text} ${afterWebhook?.Refunds?.[0]?.Status}`);

  const rest = await api(`/api/admin/orders/${orderReference}/refunds`, { method: 'POST', cookie: admin.cookie, body: { Reason: 'Cancelled by client' } });
  const again = await api(`/api/admin/orders/${orderReference}/refunds`, { method: 'POST', cookie: admin.cookie, body: { Reason: 'Again' } });
  check('full refund of the remainder marks the order refunded; further refunds are 400',
    rest.json?.order?.Status === 'refunded' && rest.json?.order?.RefundedPaise === rest.json?.order?.TotalPaise && again.status === 400 && (await countJobs('order-refunded')) === 2,
    `${rest.status} ${again.status}`);

  const detail = await api(`/api/admin/orders/${orderReference}`, { cookie: admin.cookie });
  const refundedList = await api('/api/admin/orders?status=refunded', { cookie: admin.cookie });
  const searched = await api(`/api/admin/orders?q=${orderReference}`, { cookie: admin.cookie });
  check('admin order detail, status filter and reference search',
    detail.json?.order?.Refunds?.length === 2 && refundedList.json?.items?.some((order) => order.ReferenceCode === orderReference) && searched.json?.total === 1,
    `${detail.status} ${refundedList.status} ${searched.text.slice(0, 120)}`);
}

async function runClientOrderTests({ client, otherClient }, { orderReference }) {
  const mine = await api('/api/orders/mine', { cookie: client.cookie });
  const detail = await api(`/api/orders/mine/${orderReference}`, { cookie: client.cookie });
  const otherDetail = await api(`/api/orders/mine/${orderReference}`, { cookie: otherClient.cookie });
  const signedOut = await api('/api/orders/mine');
  check('clients see their own orders only, without refund internals',
    mine.json?.orders?.some((order) => order.ReferenceCode === orderReference)
      && detail.status === 200
      && detail.json?.order?.Refunds === undefined
      && otherDetail.status === 404
      && signedOut.status === 401,
    `${mine.status} ${detail.status} ${otherDetail.status} ${signedOut.status}`);
}

// ---------- AI document review ----------
async function runDocumentReviewTests({ admin, client, otherClient }) {
  const png = await uploadForReview(client.cookie, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]), { type: 'image/png', name: 'photo.png' });
  const signedOut = await api('/api/document-reviews', { method: 'POST', body: new FormData() });
  check('review upload needs a PDF and a signed-in client', png.status === 400 && signedOut.status === 401, `${png.status} ${signedOut.status}`);

  mock.anthropicMode = 'refusal';
  const refused = await uploadForReview(client.cookie);
  const refusedReview = await waitForReview(refused.json?.review?.ReferenceCode);
  check('a declined review fails with reason "declined"',
    refused.status === 202 && refused.json?.review?.Status === 'queued' && refusedReview?.Status === 'failed' && refusedReview.FailureReason === 'declined',
    `${refused.status} ${refusedReview?.Status} ${refusedReview?.FailureReason}`);

  mock.anthropicMode = 'error';
  const errored = await uploadForReview(client.cookie);
  const erroredReview = await waitForReview(errored.json?.review?.ReferenceCode);
  check('a model error fails the review without retrying forever',
    erroredReview?.Status === 'failed' && erroredReview.FailureReason === 'error' && erroredReview.Attempts === 1,
    `${erroredReview?.Status} ${erroredReview?.FailureReason} attempts=${erroredReview?.Attempts}`);

  const tooLong = await uploadForReview(client.cookie, buildPdf(51));
  check('documents over the page cap are rejected', tooLong.status === 400 && /pages/.test(tooLong.json?.error ?? ''), tooLong.text);

  mock.anthropicMode = 'ok';
  const completedReferences = [];
  for (let index = 0; index < 3; index++) {
    const upload = await uploadForReview(client.cookie);
    const review = await waitForReview(upload.json?.review?.ReferenceCode);
    if (review?.Status === 'completed') completedReferences.push(review.ReferenceCode);
  }
  const lastRequest = mock.anthropicRequests.at(-1)?.body;
  const documentBlock = lastRequest?.messages?.[0]?.content?.[0];
  const firstCompleted = await db.collection('documentReviews').findOne({ ReferenceCode: completedReferences[0] });
  check('three reviews complete with a report, disclaimer and token usage',
    completedReferences.length === 3
      && firstCompleted.RiskLevel === 'moderate'
      && firstCompleted.Report?.risks?.[0]?.severity === 'high'
      && Boolean(firstCompleted.Report?.disclaimer)
      && firstCompleted.TokenUsage?.InputTokens === 5400,
    `completed=${completedReferences.length}`);
  check('the PDF is sent to Claude as a base64 document block with fallbacks enabled',
    documentBlock?.type === 'document' && documentBlock?.source?.media_type === 'application/pdf' && typeof documentBlock?.source?.data === 'string' && lastRequest?.fallbacks === 'default' && lastRequest?.model === 'claude-opus-5',
    JSON.stringify(documentBlock ?? {}).slice(0, 200));

  const overLimit = await uploadForReview(client.cookie);
  const mine = await api('/api/document-reviews/mine', { cookie: client.cookie });
  check('daily limit counts only reviews that did not fail',
    overLimit.status === 429 && mine.json?.allowance?.used === 3 && mine.json?.allowance?.remaining === 0 && mine.json?.reviews?.length === 5 && mine.json.reviews[0].Report === undefined,
    `${overLimit.status} ${JSON.stringify(mine.json?.allowance)} ${mine.json?.reviews?.length}`);

  const reviewReference = completedReferences[0];
  const detail = await api(`/api/document-reviews/mine/${reviewReference}`, { cookie: client.cookie });
  const otherDetail = await api(`/api/document-reviews/mine/${reviewReference}`, { cookie: otherClient.cookie });
  check('clients read their own report only', detail.json?.review?.Report?.overallRisk === 'moderate' && otherDetail.status === 404, `${detail.status} ${otherDetail.status}`);

  const missingPhone = await api(`/api/document-reviews/mine/${reviewReference}/lawyer-review`, { method: 'POST', cookie: client.cookie, body: { ConsentGiven: true } });
  const lawyerReview = await api(`/api/document-reviews/mine/${reviewReference}/lawyer-review`, { method: 'POST', cookie: client.cookie, body: { Phone: '+91 98765 43210', Notes: 'Please check the deposit clause.', ConsentGiven: true } });
  const lawyerReviewAgain = await api(`/api/document-reviews/mine/${reviewReference}/lawyer-review`, { method: 'POST', cookie: client.cookie, body: { Phone: '+91 98765 43210', ConsentGiven: true } });
  const requestReference = lawyerReview.json?.ServiceRequestReference;
  const linkedRequest = await db.collection('serviceRequests').findOne({ ReferenceCode: requestReference });
  const attachedDocument = await db.collection('documents').findOne({ RequestReference: requestReference });
  const storedReview = await db.collection('documentReviews').findOne({ ReferenceCode: reviewReference });
  check('lawyer review creates one contract-review request with the file attached',
    missingPhone.status === 400
      && lawyerReview.status === 201
      && lawyerReviewAgain.status === 200
      && lawyerReviewAgain.json?.ServiceRequestReference === requestReference
      && linkedRequest?.Source === 'document-review'
      && linkedRequest?.ServiceCategory === 'contract-review'
      && attachedDocument?.StoredName === storedReview.StoredName
      && storedReview.fileDeleteAfter === null,
    `${missingPhone.status} ${lawyerReview.status} ${lawyerReviewAgain.status} ${linkedRequest?.Source}`);

  const adminList = await api('/api/admin/document-reviews?status=completed', { cookie: admin.cookie });
  const adminDetail = await api(`/api/admin/document-reviews/${reviewReference}`, { cookie: admin.cookie });
  const clientAdmin = await api('/api/admin/document-reviews', { cookie: client.cookie });
  check('admin review list and detail (no stored file name); clients get 403',
    adminList.json?.total === 3 && adminDetail.json?.review?.Owner?.Email === CLIENT_EMAIL && adminDetail.json?.review?.StoredName === undefined && clientAdmin.status === 403,
    `${adminList.status} ${adminDetail.status} ${clientAdmin.status}`);

  check('review finished emails are queued',
    (await countJobs('document-review-completed')) === 3 && (await countJobs('document-review-failed')) === 2,
    `${await countJobs('document-review-completed')} ${await countJobs('document-review-failed')}`);
}

// ---------- Callbacks ----------
async function runCallbackTests({ admin, client }) {
  const body = { FullName: 'Arjun Mehta', Phone: '+91 90000 11111', PreferredLanguage: 'ta', PreferredTime: 'evening', ServiceCategory: 'consumer-matters', Topic: 'Refund for a faulty phone', ConsentGiven: true };
  const first = await api('/api/callbacks', { method: 'POST', body });
  const duplicate = await api('/api/callbacks', { method: 'POST', body: { ...body, Phone: '9000011111' } });
  check('callback request is created and a repeat within the window is deduplicated',
    first.status === 201 && /^LK-/.test(first.json?.callback?.ReferenceCode ?? '') && duplicate.status === 200 && duplicate.json?.isDuplicate === true && duplicate.json?.callback?.ReferenceCode === first.json.callback.ReferenceCode,
    `${first.status} ${duplicate.status} ${duplicate.text}`);

  const badLanguage = await api('/api/callbacks', { method: 'POST', body: { ...body, Phone: '+91 90000 22222', PreferredLanguage: 'xx' } });
  const fourth = await api('/api/callbacks', { method: 'POST', body: { ...body, Phone: '+91 90000 33333' } });
  const fifth = await api('/api/callbacks', { method: 'POST', body: { ...body, Phone: '+91 90000 44444' } });
  const sixth = await api('/api/callbacks', { method: 'POST', body: { ...body, Phone: '+91 90000 55555' } });
  check('invalid language is 400 and the sixth request in an hour is rate limited',
    badLanguage.status === 400 && fourth.status === 201 && fifth.status === 201 && sixth.status === 429,
    `${badLanguage.status} ${fourth.status} ${fifth.status} ${sixth.status}`);

  const alertJobs = await db.collection('notificationJobs').find({ EventName: 'callback-requested' }).toArray();
  check('the team is emailed once per new callback', alertJobs.length === 3 && alertJobs.every((job) => job.Payload.to === ADMIN_ALERT_EMAIL), `jobs=${alertJobs.length}`);

  const reference = first.json.callback.ReferenceCode;
  const updated = await api(`/api/admin/callbacks/${reference}`, { method: 'PATCH', cookie: admin.cookie, body: { Status: 'called', Note: 'Spoke to the client' } });
  const searched = await api('/api/admin/callbacks?q=9000011111', { cookie: admin.cookie });
  const newOnly = await api('/api/admin/callbacks?status=new', { cookie: admin.cookie });
  const asClient = await api(`/api/admin/callbacks/${reference}`, { method: 'PATCH', cookie: client.cookie, body: { Status: 'closed' } });
  check('admin updates status with a note, searches by phone and filters; clients get 403',
    updated.json?.callback?.Status === 'called' && updated.json.callback.Notes.length === 2 && searched.json?.total === 1 && newOnly.json?.total === 2 && asClient.status === 403,
    `${updated.status} ${searched.text.slice(0, 80)} ${newOnly.json?.total} ${asClient.status}`);
}

// ---------- Stats, overview, languages ----------
async function runStatsAndOverviewTests({ admin }) {
  const stats = await api('/api/stats/public');
  check('public stats are real counts', stats.json?.stats?.documentsReviewed === 3 && stats.json.stats.requestsResolved === 0 && stats.json.stats.consultationsCompleted === 0, stats.text);

  const overview = await api('/api/admin/overview', { cookie: admin.cookie });
  const counts = overview.json?.counts ?? {};
  check('admin overview includes orders, revenue, callbacks and reviews today',
    counts.ordersPaidToday === 5 && counts.revenuePaidTodayPaise === 49900 + 47405 + 49900 + 39900 + 0 && counts.openCallbacks === 2 && counts.documentReviewsToday === 5,
    JSON.stringify(counts));

  const features = await api('/api/features');
  const flags = features.json?.features ?? {};
  check('new feature flags are reported as on', ['serviceCatalog', 'onlinePayments', 'coupons', 'aiDocumentReview', 'callbackRequests'].every((key) => flags[key] === true), JSON.stringify(flags));

  const requestBody = { FullName: 'Rina Das', Email: 'rina@lexbridge.test', Phone: '9876501234', ServiceCategory: 'consumer-matters', Description: 'The seller refuses to replace a faulty fridge.', ConsentGiven: true };
  const withLanguage = await api('/api/service-requests', { method: 'POST', body: { ...requestBody, PreferredLanguage: 'bn' } });
  const stored = await db.collection('serviceRequests').findOne({ ReferenceCode: withLanguage.json?.ReferenceCode });
  const badLanguage = await api('/api/service-requests', { method: 'POST', body: { ...requestBody, PreferredLanguage: 'xx' } });
  const internalSource = await api('/api/service-requests', { method: 'POST', body: { ...requestBody, Source: 'catalog-order' } });
  check('service requests store a preferred language; internal sources are rejected',
    withLanguage.status === 201 && stored?.PreferredLanguage === 'bn' && badLanguage.status === 400 && internalSource.status === 400,
    `${withLanguage.status} ${stored?.PreferredLanguage} ${badLanguage.status} ${internalSource.status}`);
}

// ---------- Feature flags ----------
function readFlagInChildProcess(nodeEnv) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', "import { isFeatureEnabled } from '@lexbridge/shared'; console.log(isFeatureEnabled('coupons'));"],
    { cwd: API_DIR, env: { ...process.env, NODE_ENV: nodeEnv, FEATURE_FLAGS_OVERRIDE: '{"coupons":false}' }, encoding: 'utf8' },
  );
  return result.stdout.trim();
}

async function runFeatureFlagTests() {
  check('FEATURE_FLAGS_OVERRIDE only applies when NODE_ENV=test',
    readFlagInChildProcess('production') === 'true' && readFlagInChildProcess('test') === 'false',
    `${readFlagInChildProcess('production')} ${readFlagInChildProcess('test')}`);

  const flagsOffDb = mongoose.connection.useDb(FLAGS_OFF_DB_NAME).db;
  await flagsOffDb.dropDatabase();
  const child = startApi({
    port: FLAGS_OFF_API_PORT,
    dbName: FLAGS_OFF_DB_NAME,
    extraEnv: { FEATURE_FLAGS_OVERRIDE: JSON.stringify({ serviceCatalog: false, aiDocumentReview: false, callbackRequests: false }) },
  });
  try {
    await waitForApi(FLAGS_OFF_API_PORT, child);
    const offAdmin = await createUser(flagsOffDb, { email: 'admin@flags.test', role: 'admin', fullName: 'Flags Admin' });
    const offClient = await createUser(flagsOffDb, { email: 'client@flags.test', fullName: 'Flags Client' });
    const offApi = (pathname, options) => callApi(FLAGS_OFF_API_PORT, pathname, options);

    const features = (await offApi('/api/features')).json?.features ?? {};
    check('dependencies switch off payments and coupons with the catalogue',
      features.serviceCatalog === false && features.onlinePayments === false && features.coupons === false && features.aiDocumentReview === false && features.callbackRequests === false && features.clientAccounts === true,
      JSON.stringify(features));

    const disabledCalls = await Promise.all([
      offApi('/api/products'),
      offApi(`/api/products/${PRODUCT_A}`),
      offApi('/api/checkout/orders', { method: 'POST', body: buildOrderBody() }),
      offApi('/api/checkout/coupons/validate', { method: 'POST', body: { Items: [{ Slug: PRODUCT_A }], CouponCode: 'X' } }),
      offApi('/api/checkout/verify', { method: 'POST', body: {} }),
      offApi('/api/orders/mine', { cookie: offClient.cookie }),
      offApi('/api/document-reviews/mine', { cookie: offClient.cookie }),
      offApi('/api/document-reviews', { method: 'POST', cookie: offClient.cookie, body: new FormData() }),
      offApi('/api/callbacks', { method: 'POST', body: { FullName: 'X Y', Phone: '9000000000', ConsentGiven: true } }),
      offApi('/api/admin/products', { cookie: offAdmin.cookie }),
      offApi('/api/admin/orders', { cookie: offAdmin.cookie }),
      offApi('/api/admin/coupons', { cookie: offAdmin.cookie }),
      offApi('/api/admin/document-reviews', { cookie: offAdmin.cookie }),
      offApi('/api/admin/callbacks', { cookie: offAdmin.cookie }),
    ]);
    check('every switched-off endpoint is 404', disabledCalls.every((response) => response.status === 404), disabledCalls.map((response) => response.status).join(','));

    const overview = await offApi('/api/admin/overview', { cookie: offAdmin.cookie });
    const articles = await offApi('/api/articles');
    const stats = await offApi('/api/stats/public');
    const razorpayWebhook = await offApi('/api/webhooks/razorpay', { method: 'POST', rawBody: '{}', headers: { 'content-type': 'application/json' } });
    check('other features keep working and overview hides disabled counts',
      articles.status === 200 && stats.status === 200 && razorpayWebhook.status === 401
        && overview.json?.counts?.ordersPaidToday === null && overview.json?.counts?.openCallbacks === null && overview.json?.counts?.documentReviewsToday === null,
      `${articles.status} ${stats.status} ${razorpayWebhook.status} ${JSON.stringify(overview.json?.counts ?? {})}`);
  } finally {
    await stopApi(child);
    await flagsOffDb.dropDatabase();
  }
}

async function main() {
  await new Promise((resolve) => { mockServer.listen(MOCK_PORT, '127.0.0.1', resolve); });
  await mongoose.connect(`${MONGO_BASE_URI}/${DB_NAME}`);
  db = mongoose.connection.db;
  await db.dropDatabase();

  const apiProcess = startApi({ port: API_PORT, dbName: DB_NAME });
  let exitCode = 0;
  try {
    await waitForApi(API_PORT, apiProcess);
    await waitForIndexes(db);
    const context = {
      admin: await createUser(db, { email: 'admin@lexbridge.test', role: 'admin', fullName: 'Asha Admin' }),
      client: await createUser(db, { email: CLIENT_EMAIL, fullName: 'Priya Sharma' }),
      otherClient: await createUser(db, { email: 'other@lexbridge.test', fullName: 'Other Client' }),
    };

    await runCatalogTests(context);
    await runCouponTests(context);
    const paidOrder = await runCheckoutTests(context);
    await runRedemptionAndWebhookTests(context);
    await runFreeOrderTests(context);
    await runRefundTests(context, paidOrder);
    await runClientOrderTests(context, paidOrder);
    await runDocumentReviewTests(context);
    await runCallbackTests(context);
    await runStatsAndOverviewTests(context);
    await runFeatureFlagTests();
  } catch (err) {
    exitCode = 1;
    console.error('Test run crashed:', err);
    console.error(apiOutput.slice(-4000));
  } finally {
    await stopApi(apiProcess);
    await db.dropDatabase();
    await mongoose.disconnect();
    mockServer.close();
    fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
  }

  const failed = results.filter((result) => !result.passed);
  const errorLines = apiOutput.split('\n').filter((line) => /"level":(50|60)/.test(line));
  console.log(`\nRESULT: ${results.length - failed.length} passed, ${failed.length} failed`);
  console.log(`API error-level log lines: ${errorLines.length}`);
  errorLines.slice(0, 6).forEach((line) => console.log(`  ${line.slice(0, 300)}`));
  process.exit(failed.length > 0 ? 1 : exitCode);
}

main();
