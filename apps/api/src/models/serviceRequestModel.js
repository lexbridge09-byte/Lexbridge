import mongoose from 'mongoose';
import { REQUEST_SOURCES, REQUEST_STATUSES, SERVICE_CATEGORY_KEYS, SUPPORTED_LANGUAGE_KEYS } from '@lexbridge/shared';
import { applyPhoneLast10Hooks } from './phoneSearchHooks.js';

// Keeps each request document bounded; the oldest entries are trimmed first
export const STATUS_HISTORY_LIMIT = 50;

const statusEntrySchema = new mongoose.Schema(
  {
    Status: { type: String, enum: REQUEST_STATUSES, required: true },
    Note: { type: String, default: '', maxlength: 1000 },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const serviceRequestSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    FullName: { type: String, required: true, trim: true, maxlength: 120 },
    // Required except for handoffs from the WhatsApp assistant, where only the phone number is known
    Email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
      required: [function isEmailRequired() { return this.Source !== 'whatsapp-agent'; }, 'Email is required'],
    },
    Phone: { type: String, required: true, trim: true, maxlength: 20 },
    // Last 10 digits of Phone, kept in sync by hooks, so admin phone search can use an index
    PhoneLast10: { type: String, default: '' },
    ServiceCategory: { type: String, enum: SERVICE_CATEGORY_KEYS, required: true },
    Subtype: { type: String, trim: true, default: '', maxlength: 120 },
    Description: { type: String, required: true, maxlength: 5000 },
    Source: { type: String, enum: REQUEST_SOURCES, required: true },
    Status: { type: String, enum: REQUEST_STATUSES, default: 'submitted' },
    StatusHistory: {
      type: [statusEntrySchema],
      default: [],
      validate: {
        validator: (entries) => entries.length <= STATUS_HISTORY_LIMIT,
        message: `Status history is limited to ${STATUS_HISTORY_LIMIT} entries`,
      },
    },
    AssignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    WhatsAppOptIn: { type: Boolean, default: false },
    PreferredLanguage: { type: String, enum: SUPPORTED_LANGUAGE_KEYS, default: 'en' },
    ConsentGiven: { type: Boolean, required: true },
    consentedAt: { type: Date, required: true },
  },
  { timestamps: true, collection: 'serviceRequests' },
);

applyPhoneLast10Hooks(serviceRequestSchema);

// Each index matches a filter + sort used by a route (see SCALING.md)
serviceRequestSchema.index({ Client: 1, createdAt: -1 });
serviceRequestSchema.index({ Email: 1, createdAt: -1 });
serviceRequestSchema.index({ Status: 1, createdAt: -1 });
serviceRequestSchema.index({ ServiceCategory: 1, createdAt: -1 });
serviceRequestSchema.index({ Status: 1, ServiceCategory: 1, createdAt: -1 });
serviceRequestSchema.index({ createdAt: -1 });
serviceRequestSchema.index({ PhoneLast10: 1, createdAt: -1 });
serviceRequestSchema.index({ FullName: 'text' }, { name: 'FullName_text', default_language: 'none' });

export const ServiceRequestModel = mongoose.model('ServiceRequest', serviceRequestSchema);
