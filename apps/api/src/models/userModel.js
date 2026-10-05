import mongoose from 'mongoose';
import { applyPhoneLast10Hooks } from './phoneSearchHooks.js';

// client submits requests; lawyer does assigned work; manager assigns and tracks; owner has everything
export const USER_ROLES = ['client', 'lawyer', 'manager', 'owner'];
export const STAFF_ROLES = ['lawyer', 'manager', 'owner'];

const userSchema = new mongoose.Schema(
  {
    FullName: { type: String, trim: true, default: '', maxlength: 120 },
    Email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    Phone: { type: String, trim: true, default: '', maxlength: 20 },
    PhoneLast10: { type: String, default: '' },
    Role: { type: String, enum: USER_ROLES, default: 'client' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, collection: 'users' },
);

applyPhoneLast10Hooks(userSchema);

userSchema.index({ Role: 1, createdAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ PhoneLast10: 1 });
userSchema.index({ FullName: 'text' }, { name: 'FullName_text', default_language: 'none' });

export const UserModel = mongoose.model('User', userSchema);
