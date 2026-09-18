/*
  Runs explain('executionStats') on every hot query and fails if any of them scans a whole collection.
  Expects data from seedLoadData.js:
    MONGO_URI=mongodb://127.0.0.1:27017/lexbridge_scale pnpm --filter @lexbridge/api db:explain
*/
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/db/index.js';
import {
  ArticleModel,
  ConsultationModel,
  DocumentModel,
  NotificationJobModel,
  ServiceRequestModel,
  SlotModel,
  UserModel,
} from '../src/models/index.js';
import { deriveContactSearchFilter } from '../src/utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const fixtures = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'lexbridge-load-fixtures.json'), 'utf8'));

await connectDb();

const now = new Date();
const heavyClientId = new mongoose.Types.ObjectId(fixtures.heavyClient.id);
const heavyClientEmail = fixtures.heavyClient.email;
const requests = ServiceRequestModel.collection;
const consultations = ConsultationModel.collection;

const QUERIES = [
  ['client: my requests (heaviest client)', () => requests.find({ $or: [{ Client: heavyClientId }, { Email: heavyClientEmail }] }).sort({ createdAt: -1 }).limit(200)],
  ['client: one request', () => requests.find({ ReferenceCode: fixtures.search.referenceCode, $or: [{ Client: heavyClientId }, { Email: heavyClientEmail }] }).limit(1)],
  ['client: my consultations', () => consultations.find({ Client: heavyClientId }).sort({ StartsAt: -1 }).limit(200)],
  ['client: my documents', () => DocumentModel.collection.find({ Owner: heavyClientId }).sort({ createdAt: -1 }).limit(500)],
  ['public: open slots (21 days)', () => SlotModel.collection.find({ Status: 'open', StartsAt: { $gt: now, $lte: new Date(now.getTime() + 21 * DAY_MS) } }).sort({ StartsAt: 1 }).limit(500)],
  ['public: published articles', () => ArticleModel.collection.find({ Status: 'published' }).sort({ publishedAt: -1 }).limit(200)],
  ['public: articles by topic', () => ArticleModel.collection.find({ Status: 'published', Topic: 'contracts' }).sort({ publishedAt: -1 }).limit(200)],
  ['public: article by slug', () => ArticleModel.collection.find({ Slug: 'guide-7', Status: 'published' }).limit(1)],
  ['admin: requests, newest (page 1)', () => requests.find({}).sort({ createdAt: -1 }).limit(20)],
  ['admin: requests by status (page 3)', () => requests.find({ Status: 'in-progress' }).sort({ createdAt: -1 }).skip(40).limit(20)],
  ['admin: requests by category', () => requests.find({ ServiceCategory: 'consumer-matters' }).sort({ createdAt: -1 }).limit(20)],
  ['admin: requests by status + category', () => requests.find({ Status: 'submitted', ServiceCategory: 'criminal-law' }).sort({ createdAt: -1 }).limit(20)],
  ['admin: search reference prefix', () => requests.find(deriveContactSearchFilter(fixtures.search.referencePrefix, { hasReferenceCode: true })).sort({ createdAt: -1 }).limit(20)],
  ['admin: search email prefix', () => requests.find(deriveContactSearchFilter(`${fixtures.search.emailPrefix}@`, { hasReferenceCode: true })).sort({ createdAt: -1 }).limit(20)],
  ['admin: search phone (10 digits)', () => requests.find(deriveContactSearchFilter(fixtures.search.phoneLast10, { hasReferenceCode: true })).sort({ createdAt: -1 }).limit(20)],
  ['admin: search phone prefix', () => requests.find(deriveContactSearchFilter(fixtures.search.phonePrefix, { hasReferenceCode: true })).sort({ createdAt: -1 }).limit(20)],
  ['admin: search name (text index)', () => requests.find(deriveContactSearchFilter(fixtures.search.name, { hasReferenceCode: true })).sort({ createdAt: -1 }).limit(20)],
  ['admin: request documents', () => DocumentModel.collection.find({ RequestReference: fixtures.search.referenceCode }).sort({ createdAt: -1 }).limit(200)],
  ['admin: consultations scheduled', () => consultations.find({ Status: 'scheduled' }).sort({ StartsAt: 1 }).limit(20)],
  ['admin: consultations date range', () => consultations.find({ StartsAt: { $gte: now, $lte: new Date(now.getTime() + 7 * DAY_MS) } }).sort({ StartsAt: 1 }).limit(20)],
  ['admin: slots (31 days)', () => SlotModel.collection.find({ StartsAt: { $gte: new Date(now.getTime() - DAY_MS), $lte: new Date(now.getTime() + 30 * DAY_MS) } }).sort({ StartsAt: 1 }).limit(1000)],
  ['admin: users by role', () => UserModel.collection.find({ Role: 'admin' }).sort({ createdAt: -1 }).limit(20)],
  ['admin: users search phone', () => UserModel.collection.find(deriveContactSearchFilter(fixtures.search.phoneLast10)).sort({ createdAt: -1 }).limit(20)],
  ['admin: users search name', () => UserModel.collection.find(deriveContactSearchFilter(fixtures.search.name)).sort({ createdAt: -1 }).limit(20)],
  ['auth: user by email', () => UserModel.collection.find({ Email: heavyClientEmail }).limit(1)],
  ['worker: claim notification job', () => NotificationJobModel.collection.find({ $or: [{ Status: 'pending', nextAttemptAt: { $lte: now } }, { Status: 'processing', lockedUntil: { $lte: now } }] }).limit(1)],
];

// Stages appear in different shapes (classic plans, SBE query plans, $or branches); walk them all
function collectStages(plan, stages = []) {
  if (!plan || typeof plan !== 'object') return stages;
  if (plan.stage) stages.push(plan.stage);
  for (const key of ['queryPlan', 'inputStage', 'winningPlan']) collectStages(plan[key], stages);
  for (const child of plan.inputStages ?? []) collectStages(child, stages);
  return stages;
}

const rows = [];
let collectionScanCount = 0;
for (const [name, buildCursor] of QUERIES) {
  const explanation = await buildCursor().explain('executionStats');
  const stages = [...new Set(collectStages(explanation.queryPlanner.winningPlan))];
  const stats = explanation.executionStats;
  const hasCollectionScan = stages.includes('COLLSCAN');
  if (hasCollectionScan) collectionScanCount++;
  rows.push({
    query: name,
    plan: stages.join(' > '),
    keysExamined: stats.totalKeysExamined,
    docsExamined: stats.totalDocsExamined,
    returned: stats.nReturned,
    ms: stats.executionTimeMillis,
    verdict: hasCollectionScan ? 'COLLSCAN' : 'index',
  });
}

const counts = {
  users: await UserModel.estimatedDocumentCount(),
  serviceRequests: await ServiceRequestModel.estimatedDocumentCount(),
  consultations: await ConsultationModel.estimatedDocumentCount(),
  slots: await SlotModel.estimatedDocumentCount(),
  documents: await DocumentModel.estimatedDocumentCount(),
};
console.log('Collection sizes:', counts);
console.log('Heaviest client has', fixtures.heavyClient.requestCount, 'requests');
console.table(rows);

await disconnectDb();
if (collectionScanCount > 0) {
  console.error(`${collectionScanCount} queries use a collection scan`);
  process.exit(1);
}
console.log('All hot queries are index-backed.');
