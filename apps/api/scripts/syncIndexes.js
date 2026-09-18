/*
  Creates the indexes declared in the schemas, drops indexes that are no longer declared,
  and backfills derived search fields. Run on deploy (production boots with MONGO_AUTO_INDEX off):
    pnpm --filter @lexbridge/api db:sync-indexes
*/
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/db/index.js';
import * as models from '../src/models/index.js';
import { derivePhoneLast10 } from '../src/utils.js';

const BACKFILL_BATCH_SIZE = 1000;

function isMongooseModel(value) {
  return typeof value === 'function' && value.prototype instanceof mongoose.Model;
}

// Documents written before PhoneLast10 existed need it for indexed phone search
async function backfillPhoneLast10(Model) {
  const cursor = Model.collection.find(
    { Phone: { $nin: ['', null] }, PhoneLast10: { $exists: false } },
    { projection: { Phone: 1 } },
  );
  let operations = [];
  let updatedCount = 0;
  for await (const document of cursor) {
    operations.push({
      updateOne: { filter: { _id: document._id }, update: { $set: { PhoneLast10: derivePhoneLast10(document.Phone) } } },
    });
    if (operations.length === BACKFILL_BATCH_SIZE) {
      await Model.collection.bulkWrite(operations, { ordered: false });
      updatedCount += operations.length;
      operations = [];
    }
  }
  if (operations.length > 0) {
    await Model.collection.bulkWrite(operations, { ordered: false });
    updatedCount += operations.length;
  }
  return updatedCount;
}

await connectDb();

for (const Model of [models.UserModel, models.ServiceRequestModel]) {
  const updatedCount = await backfillPhoneLast10(Model);
  console.log(`[backfill] ${Model.collection.name}: set PhoneLast10 on ${updatedCount} documents`);
}

for (const Model of Object.values(models).filter(isMongooseModel)) {
  const startedAt = Date.now();
  const droppedIndexes = await Model.syncIndexes();
  const indexNames = (await Model.collection.indexes()).map((index) => index.name);
  console.log(
    `[indexes] ${Model.collection.name}: ${indexNames.length} indexes in ${Date.now() - startedAt} ms`
    + (droppedIndexes.length ? `; dropped ${droppedIndexes.join(', ')}` : ''),
  );
}

await disconnectDb();
