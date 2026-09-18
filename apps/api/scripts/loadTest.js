/*
  Load test against a running API with seeded data (see seedLoadData.js).
    LOAD_TEST_URL=http://localhost:5056 LOAD_TEST_CONNECTIONS=200,1000 LOAD_TEST_DURATION=20 \
      pnpm --filter @lexbridge/api load:test
  Session cookies are signed locally with JWT_SECRET, so the API must use the same secret.
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import autocannon from 'autocannon';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, SESSION_COOKIE_NAME } from '../src/config/index.js';

const BASE_URL = process.env.LOAD_TEST_URL ?? 'http://localhost:5056';
const CONNECTION_LEVELS = (process.env.LOAD_TEST_CONNECTIONS ?? '200,1000').split(',').map(Number);
const ADMIN_CONNECTIONS = Number(process.env.LOAD_TEST_ADMIN_CONNECTIONS ?? 50);
const DURATION_SECONDS = Number(process.env.LOAD_TEST_DURATION ?? 20);
const LABEL = process.env.LOAD_TEST_LABEL ?? 'single process';
const RESULTS_PATH = path.join(os.tmpdir(), 'lexbridge-load-results.json');

const fixtures = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'lexbridge-load-fixtures.json'), 'utf8'));

function createSessionCookie(user) {
  const token = jwt.sign({ email: user.email }, JWT_SECRET, { subject: user.id, expiresIn: '2h' });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

const SCENARIOS = [
  {
    name: 'public pages (health, articles, slots)',
    connectionLevels: CONNECTION_LEVELS,
    requests: [
      { method: 'GET', path: '/api/health' },
      { method: 'GET', path: '/api/articles' },
      { method: 'GET', path: '/api/articles?topic=contracts' },
      { method: 'GET', path: '/api/consultations/slots' },
    ],
  },
  {
    name: 'signed-in client dashboard (heaviest client)',
    connectionLevels: CONNECTION_LEVELS,
    headers: { cookie: createSessionCookie(fixtures.heavyClient) },
    requests: [
      { method: 'GET', path: '/api/auth/me' },
      { method: 'GET', path: '/api/service-requests/mine' },
      { method: 'GET', path: '/api/consultations/mine' },
      { method: 'GET', path: '/api/documents/mine' },
    ],
  },
  {
    name: 'admin lists and search',
    connectionLevels: [ADMIN_CONNECTIONS],
    headers: { cookie: createSessionCookie(fixtures.admin) },
    requests: [
      { method: 'GET', path: '/api/admin/service-requests?status=in-progress&page=3' },
      { method: 'GET', path: '/api/admin/service-requests?category=consumer-matters' },
      { method: 'GET', path: `/api/admin/service-requests?q=${encodeURIComponent(`${fixtures.search.emailPrefix}@`)}` },
      { method: 'GET', path: `/api/admin/service-requests?q=${encodeURIComponent(fixtures.search.name)}` },
      { method: 'GET', path: '/api/admin/consultations?status=scheduled' },
      { method: 'GET', path: '/api/admin/overview' },
    ],
  },
];

function runScenario(scenario, connections) {
  return new Promise((resolve, reject) => {
    autocannon(
      {
        url: BASE_URL,
        connections,
        duration: DURATION_SECONDS,
        timeout: 10,
        headers: scenario.headers,
        requests: scenario.requests,
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
  });
}

const rows = [];
for (const scenario of SCENARIOS) {
  for (const connections of scenario.connectionLevels) {
    console.log(`Running "${scenario.name}" with ${connections} connections for ${DURATION_SECONDS} s...`);
    const result = await runScenario(scenario, connections);
    rows.push({
      mode: LABEL,
      scenario: scenario.name,
      connections,
      'req/s avg': Math.round(result.requests.average),
      'p50 ms': result.latency.p50,
      'p97.5 ms': result.latency.p97_5,
      'p99 ms': result.latency.p99,
      requests: result.requests.total,
      non2xx: result.non2xx,
      errors: result.errors,
      timeouts: result.timeouts,
    });
  }
}

console.table(rows);
const previousRows = fs.existsSync(RESULTS_PATH) ? JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8')) : [];
fs.writeFileSync(RESULTS_PATH, JSON.stringify([...previousRows, ...rows], null, 2));
console.log(`Results appended to ${RESULTS_PATH}`);
