import mongoose from 'mongoose';

// One row per feature flag key; the code defaults in @lexbridge/shared seed this collection on first read
const featureFlagSchema = new mongoose.Schema(
  {
    Key: { type: String, required: true, unique: true },
    Enabled: { type: Boolean, required: true },
    UpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: 'featureFlags' },
);

export const FeatureFlagModel = mongoose.model('FeatureFlag', featureFlagSchema);
