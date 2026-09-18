import mongoose from 'mongoose';
import { DOCUMENT_REVIEW_RISK_LEVELS, DOCUMENT_REVIEW_STATUSES } from '@lexbridge/shared';

export const DOCUMENT_REVIEW_FAILURE_REASONS = ['', 'declined', 'error'];

// An uploaded PDF and its AI-generated report. Also the work queue for the review worker.
const documentReviewSchema = new mongoose.Schema(
  {
    ReferenceCode: { type: String, required: true, unique: true },
    Owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    OriginalName: { type: String, required: true, maxlength: 150 },
    StoredName: { type: String, required: true },
    SizeBytes: { type: Number, required: true },
    PageCountEstimate: { type: Number, default: 0 },
    Status: { type: String, enum: DOCUMENT_REVIEW_STATUSES, default: 'queued' },
    Attempts: { type: Number, default: 0 },
    MaxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now },
    lockedUntil: { type: Date, default: null },
    LastError: { type: String, default: '', maxlength: 1000 },
    FailureReason: { type: String, enum: DOCUMENT_REVIEW_FAILURE_REASONS, default: '' },
    // Validated against the report schema when generated
    Report: { type: mongoose.Schema.Types.Mixed, default: null },
    RiskLevel: { type: String, enum: [...DOCUMENT_REVIEW_RISK_LEVELS, ''], default: '' },
    Model: { type: String, default: '' },
    TokenUsage: {
      InputTokens: { type: Number, default: 0 },
      OutputTokens: { type: Number, default: 0 },
    },
    completedAt: { type: Date, default: null },
    // When the uploaded file is deleted (DPDP data minimisation). null keeps it, e.g. once a lawyer review is requested.
    fileDeleteAfter: { type: Date, default: null },
    FileDeletedAt: { type: Date, default: null },
    ServiceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', default: null },
    ServiceRequestReference: { type: String, default: '' },
    lawyerReviewRequestedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'documentReviews' },
);

// Client list and the rolling daily limit
documentReviewSchema.index({ Owner: 1, createdAt: -1 });
// Worker claims: due queued jobs and expired locks
documentReviewSchema.index({ Status: 1, nextAttemptAt: 1 });
documentReviewSchema.index({ Status: 1, lockedUntil: 1 });
// Admin list and stats
documentReviewSchema.index({ Status: 1, createdAt: -1 });
documentReviewSchema.index({ createdAt: -1 });
// File retention sweep
documentReviewSchema.index({ FileDeletedAt: 1, fileDeleteAfter: 1 });

export const DocumentReviewModel = mongoose.model('DocumentReview', documentReviewSchema);
