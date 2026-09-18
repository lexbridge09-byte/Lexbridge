import mongoose from 'mongoose';
import {
  CALLBACK_STATUSES,
  CALLBACK_TIME_WINDOW_KEYS,
  SERVICE_CATEGORY_KEYS,
  SUPPORTED_LANGUAGE_KEYS,
} from '@lexbridge/shared';
import { applyPhoneLast10Hooks } from './phoneSearchHooks.js';

export const CALLBACK_NOTE_LIMIT = 50;

const callbackNoteSchema = new mongoose.Schema(
  {
    Status: { type: String, enum: CALLBACK_STATUSES, required: true },
    Note: { type: String, default: '', maxlength: 1000 },
    ChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// A "call me back" request from the website
const callbackRequestSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    FullName: { type: String, required: true, trim: true, maxlength: 120 },
    Phone: { type: String, required: true, trim: true, maxlength: 20 },
    PhoneLast10: { type: String, default: '' },
    PreferredLanguage: { type: String, enum: SUPPORTED_LANGUAGE_KEYS, default: 'en' },
    PreferredTime: { type: String, enum: CALLBACK_TIME_WINDOW_KEYS, default: 'now' },
    ServiceCategory: { type: String, enum: SERVICE_CATEGORY_KEYS, default: 'other' },
    Topic: { type: String, trim: true, default: '', maxlength: 500 },
    Status: { type: String, enum: CALLBACK_STATUSES, default: 'new' },
    Notes: {
      type: [callbackNoteSchema],
      default: [],
      validate: { validator: (entries) => entries.length <= CALLBACK_NOTE_LIMIT, message: `Up to ${CALLBACK_NOTE_LIMIT} notes` },
    },
    ConsentGiven: { type: Boolean, required: true },
    consentedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'callbackRequests' },
);

applyPhoneLast10Hooks(callbackRequestSchema);

callbackRequestSchema.index({ Status: 1, createdAt: -1 });
callbackRequestSchema.index({ createdAt: -1 });
// Admin phone search and duplicate detection
callbackRequestSchema.index({ PhoneLast10: 1, createdAt: -1 });

export const CallbackRequestModel = mongoose.model('CallbackRequest', callbackRequestSchema);
