/*
  Fills a throwaway database with production-sized data for query and load testing:
  15,000 users, 50,000 service requests, 8,000 slots, 5,000 consultations, 20,000 documents, 60 articles.
  Refuses to run in production or against a database whose name doesn't look disposable.
    MONGO_URI=mongodb://127.0.0.1:27017/lexbridge_scale pnpm --filter @lexbridge/api seed:load
*/
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mongoose from 'mongoose';
import {
  APP_UTC_OFFSET,
  ARTICLE_TOPIC_KEYS,
  CONSULTATION_MODE_KEYS,
  CONSULTATION_TYPE_KEYS,
  REQUEST_SOURCES,
  SERVICE_CATEGORY_KEYS,
} from '@lexbridge/shared';
import { IS_PRODUCTION } from '../src/config/index.js';
import { connectDb, disconnectDb } from '../src/db/index.js';
import * as models from '../src/models/index.js';
import { derivePhoneLast10 } from '../src/utils.js';

const COUNTS = {
  users: 15_000,
  admins: 5,
  requests: 50_000,
  slots: 8_000,
  consultations: 5_000,
  documents: 20_000,
  articles: 60,
};
const INSERT_BATCH_SIZE = 2_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOT_STEP_MINUTES = 15;
const SLOTS_PER_DAY = 36; // 09:00-18:00 IST
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FIXTURES_PATH = path.join(os.tmpdir(), 'lexbridge-load-fixtures.json');

const FIRST_NAMES = ['Aarav', 'Vihaan', 'Aditya', 'Ananya', 'Diya', 'Ishaan', 'Kavya', 'Rohan', 'Priya', 'Arjun',
  'Meera', 'Kabir', 'Sanya', 'Nikhil', 'Pooja', 'Rahul', 'Sneha', 'Vikram', 'Neha', 'Karan'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Nair', 'Reddy', 'Gupta', 'Patel', 'Singh', 'Khan', 'Das',
  'Mehta', 'Joshi', 'Rao', 'Kulkarni', 'Chopra', 'Bose', 'Menon', 'Pillai', 'Agarwal', 'Malhotra'];
const REQUEST_STATUS_WEIGHTS = [
  ['submitted', 20], ['under-review', 15], ['in-progress', 20], ['awaiting-client', 10], ['completed', 25], ['closed', 10],
];

// Deterministic PRNG so every run produces the same data
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = createRandom(20260913);
const pick = (items) => items[Math.floor(random() * items.length)];
const pickWeighted = (weightedItems) => {
  const total = weightedItems.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [item, weight] of weightedItems) {
    roll -= weight;
    if (roll < 0) return item;
  }
  return weightedItems.at(-1)[0];
};

function encodeIndex(index, length = 6) {
  let code = '';
  let remaining = index;
  for (let i = 0; i < length; i++) {
    code = REFERENCE_ALPHABET[remaining % REFERENCE_ALPHABET.length] + code;
    remaining = Math.floor(remaining / REFERENCE_ALPHABET.length);
  }
  return code;
}

function deriveDatePart(date) {
  return date.toISOString().slice(2, 10).replaceAll('-', '');
}

function isDisposableDatabase(databaseName) {
  return /(scale|load|seed|test)/i.test(databaseName);
}

async function insertInBatches(Model, documents) {
  for (let start = 0; start < documents.length; start += INSERT_BATCH_SIZE) {
    await Model.collection.insertMany(documents.slice(start, start + INSERT_BATCH_SIZE), { ordered: false });
  }
  console.log(`[seed] ${Model.collection.name}: inserted ${documents.length}`);
}

await connectDb();
const databaseName = mongoose.connection.name;
if (IS_PRODUCTION || !isDisposableDatabase(databaseName)) {
  await disconnectDb();
  throw new Error(`Refusing to seed "${databaseName}": seeding deletes existing data. Use a database whose name contains scale, load, seed or test.`);
}

const startedAt = Date.now();
const allModels = Object.values(models).filter((value) => typeof value === 'function' && value.prototype instanceof mongoose.Model);
await Promise.all(allModels.map((Model) => Model.collection.deleteMany({})));

const now = Date.now();
const randomPastDate = (maxDaysBack) => new Date(now - Math.floor(random() * maxDaysBack * DAY_MS));

// Users: a handful of admins, the rest clients
const users = Array.from({ length: COUNTS.users }, (_, index) => {
  const isAdmin = index < COUNTS.admins;
  const createdAt = randomPastDate(400);
  const phone = `+91 9${String(index).padStart(9, '0')}`;
  return {
    _id: new mongoose.Types.ObjectId(),
    FullName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    Email: isAdmin ? `admin${index}@load.test` : `client${index}@load.test`,
    Phone: phone,
    PhoneLast10: derivePhoneLast10(phone),
    Role: isAdmin ? 'admin' : 'client',
    lastLoginAt: new Date(createdAt.getTime() + Math.floor(random() * (now - createdAt.getTime()))),
    createdAt,
    updatedAt: createdAt,
    __v: 0,
  };
});
const clientCount = COUNTS.users - COUNTS.admins;
// Skewed so a few clients have many requests, like real usage
const pickClientIndex = () => COUNTS.admins + Math.floor(clientCount * random() ** 3);

// Service requests
const requestCountsByUser = new Map();
const requestOwners = [];
const requests = Array.from({ length: COUNTS.requests }, (_, index) => {
  const userIndex = pickClientIndex();
  const user = users[userIndex];
  const createdAt = randomPastDate(365);
  const status = pickWeighted(REQUEST_STATUS_WEIGHTS);
  const historyLength = 1 + Math.floor(random() * 4);
  const statusHistory = Array.from({ length: historyLength }, (__, historyIndex) => ({
    Status: historyIndex === historyLength - 1 ? status : 'submitted',
    Note: historyIndex > 0 ? 'We have reviewed the documents you shared.' : '',
    changedAt: new Date(createdAt.getTime() + historyIndex * DAY_MS),
  }));
  const referenceCode = `LB-${deriveDatePart(createdAt)}-${encodeIndex(index)}`;
  requestCountsByUser.set(userIndex, (requestCountsByUser.get(userIndex) ?? 0) + 1);
  requestOwners.push({ referenceCode, ownerId: user._id });
  return {
    _id: new mongoose.Types.ObjectId(),
    ReferenceCode: referenceCode,
    // About a third were submitted before the person created an account
    Client: random() < 0.7 ? user._id : null,
    FullName: user.FullName,
    Email: user.Email,
    Phone: user.Phone,
    PhoneLast10: user.PhoneLast10,
    ServiceCategory: pick(SERVICE_CATEGORY_KEYS),
    Subtype: '',
    Description: 'My landlord has not returned the security deposit three months after I moved out, and has stopped replying to messages. I have the rental agreement and payment receipts.',
    Source: pick(REQUEST_SOURCES),
    Status: status,
    StatusHistory: statusHistory,
    AssignedTo: random() < 0.6 ? users[Math.floor(random() * COUNTS.admins)]._id : null,
    WhatsAppOptIn: random() < 0.5,
    ConsentGiven: true,
    consentedAt: createdAt,
    createdAt,
    updatedAt: statusHistory.at(-1).changedAt,
    __v: 0,
  };
});

// Slots every 15 minutes during IST office hours, from 180 days ago onwards
const firstSlotDay = new Date(now - 180 * DAY_MS).toISOString().slice(0, 10);
const firstSlotAt = new Date(`${firstSlotDay}T09:00:00${APP_UTC_OFFSET}`).getTime();
const slots = Array.from({ length: COUNTS.slots }, (_, index) => {
  const dayIndex = Math.floor(index / SLOTS_PER_DAY);
  const stepIndex = index % SLOTS_PER_DAY;
  const startsAt = new Date(firstSlotAt + dayIndex * DAY_MS + stepIndex * SLOT_STEP_MINUTES * 60 * 1000);
  return {
    _id: new mongoose.Types.ObjectId(),
    StartsAt: startsAt,
    DurationMinutes: 30,
    Status: 'open',
    Consultation: null,
    createdAt: new Date(now - 200 * DAY_MS),
    updatedAt: new Date(now - 200 * DAY_MS),
    __v: 0,
  };
});

// Consultations on randomly chosen slots
const slotOrder = slots.map((_, index) => index);
for (let i = slotOrder.length - 1; i > 0; i--) {
  const j = Math.floor(random() * (i + 1));
  [slotOrder[i], slotOrder[j]] = [slotOrder[j], slotOrder[i]];
}
const consultations = slotOrder.slice(0, COUNTS.consultations).map((slotIndex, index) => {
  const slot = slots[slotIndex];
  const client = users[pickClientIndex()];
  const isPast = slot.StartsAt.getTime() < now;
  const status = isPast
    ? pickWeighted([['completed', 70], ['no-show', 10], ['cancelled', 20]])
    : pickWeighted([['scheduled', 85], ['cancelled', 15]]);
  const consultationId = new mongoose.Types.ObjectId();
  if (status !== 'cancelled') {
    slot.Status = 'booked';
    slot.Consultation = consultationId;
  }
  const createdAt = new Date(slot.StartsAt.getTime() - Math.floor(random() * 14 * DAY_MS));
  return {
    _id: consultationId,
    ReferenceCode: `LC-${deriveDatePart(createdAt)}-${encodeIndex(index)}`,
    Client: client._id,
    Slot: slot._id,
    ConsultationType: pick(CONSULTATION_TYPE_KEYS),
    Mode: pick(CONSULTATION_MODE_KEYS),
    StartsAt: slot.StartsAt,
    DurationMinutes: slot.DurationMinutes,
    Phone: client.Phone,
    Description: 'I would like to understand my options regarding a consumer complaint.',
    Status: status,
    MeetingLink: '',
    AdminNote: '',
    AssignedTo: null,
    WhatsAppOptIn: random() < 0.5,
    ConsentGiven: true,
    consentedAt: createdAt,
    ...(status === 'cancelled' ? { cancelledAt: createdAt } : {}),
    createdAt,
    updatedAt: createdAt,
    __v: 0,
  };
});

// Document records (metadata only, no files)
const documents = Array.from({ length: COUNTS.documents }, () => {
  const { referenceCode, ownerId } = pick(requestOwners);
  const createdAt = randomPastDate(365);
  return {
    _id: new mongoose.Types.ObjectId(),
    Owner: ownerId,
    RequestReference: referenceCode,
    OriginalName: 'rental-agreement.pdf',
    StoredName: `${crypto.randomUUID()}.pdf`,
    MimeType: 'application/pdf',
    SizeBytes: 50_000 + Math.floor(random() * 2_000_000),
    UploadedByRole: random() < 0.8 ? 'client' : 'admin',
    UploadedBy: ownerId,
    createdAt,
    updatedAt: createdAt,
    __v: 0,
  };
});

const articles = Array.from({ length: COUNTS.articles }, (_, index) => {
  const createdAt = randomPastDate(300);
  const isPublished = index < 50;
  return {
    _id: new mongoose.Types.ObjectId(),
    Slug: `guide-${index + 1}`,
    Title: `Practical guide number ${index + 1}`,
    Summary: 'A short, plain-language explanation of a common legal situation.',
    Topic: pick(ARTICLE_TOPIC_KEYS),
    Body: '## What to do first\n\nRead the document carefully and note any deadlines.\n'.repeat(20),
    Status: isPublished ? 'published' : 'draft',
    Author: users[0]._id,
    publishedAt: isPublished ? createdAt : null,
    createdAt,
    updatedAt: createdAt,
    __v: 0,
  };
});

await insertInBatches(models.UserModel, users);
await insertInBatches(models.ServiceRequestModel, requests);
await insertInBatches(models.SlotModel, slots);
await insertInBatches(models.ConsultationModel, consultations);
await insertInBatches(models.DocumentModel, documents);
await insertInBatches(models.ArticleModel, articles);

for (const Model of allModels) await Model.syncIndexes();
console.log('[seed] indexes synced');

// Fixtures for explainQueries.js and loadTest.js
const [heavyClientIndex, heavyClientRequestCount] = [...requestCountsByUser.entries()].sort((a, b) => b[1] - a[1])[0];
const typicalClientIndex = COUNTS.admins + Math.floor(clientCount / 2);
const toFixtureUser = (user) => ({ id: String(user._id), email: user.Email });
const fixtures = {
  databaseName,
  admin: toFixtureUser(users[0]),
  heavyClient: { ...toFixtureUser(users[heavyClientIndex]), requestCount: heavyClientRequestCount },
  typicalClient: { ...toFixtureUser(users[typicalClientIndex]), requestCount: requestCountsByUser.get(typicalClientIndex) ?? 0 },
  search: {
    emailPrefix: 'client1234',
    phoneLast10: users[4321].PhoneLast10,
    phonePrefix: users[4321].PhoneLast10.slice(0, 6),
    name: users[777].FullName.split(' ')[1],
    referencePrefix: requests[12345].ReferenceCode.slice(0, 9),
    referenceCode: requests[12345].ReferenceCode,
  },
};
fs.writeFileSync(FIXTURES_PATH, JSON.stringify(fixtures, null, 2));

console.log(`[seed] done in ${((Date.now() - startedAt) / 1000).toFixed(1)} s; fixtures written to ${FIXTURES_PATH}`);
console.log(JSON.stringify(fixtures, null, 2));
await disconnectDb();
