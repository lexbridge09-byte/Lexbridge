/*
  One-time migration for the 4-role model: the old 'admin' role becomes 'owner' on users,
  and document UploadedByRole 'admin' becomes 'owner'. Safe to re-run (idempotent):
    pnpm --filter @lexbridge/api db:migrate-roles
*/
import { connectDb, disconnectDb } from '../src/db/index.js';
import { DocumentModel, UserModel } from '../src/models/index.js';

await connectDb();

const users = await UserModel.updateMany({ Role: 'admin' }, { $set: { Role: 'owner' } });
console.log(`[roles] users: ${users.modifiedCount} 'admin' accounts promoted to 'owner'`);

const documents = await DocumentModel.updateMany({ UploadedByRole: 'admin' }, { $set: { UploadedByRole: 'owner' } });
console.log(`[roles] documents: ${documents.modifiedCount} UploadedByRole values moved 'admin' → 'owner'`);

await disconnectDb();
