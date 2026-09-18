import mongoose from 'mongoose';

// Keep in step with ORDER_STAGE_LIMIT in @lexbridge/shared
export const STAGE_LIST_LIMIT = 12;
export const STAGE_HISTORY_LIMIT = 50;

// A named step on an order timeline, e.g. { Key: 'draft-ready', Label: 'Draft ready', LabelHi: 'ड्राफ़्ट तैयार' }
const stageSchema = new mongoose.Schema(
  {
    Key: { type: String, required: true, trim: true, lowercase: true, maxlength: 40, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
    Label: { type: String, required: true, trim: true, maxlength: 80 },
    LabelHi: { type: String, trim: true, default: '', maxlength: 80 },
  },
  { _id: false },
);

const stageHistorySchema = new mongoose.Schema(
  {
    Key: { type: String, required: true, maxlength: 40 },
    Note: { type: String, default: '', maxlength: 500 },
    ChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

export function stageListField() {
  return {
    type: [stageSchema],
    default: [],
    validate: {
      validator: (stages) => stages.length <= STAGE_LIST_LIMIT && new Set(stages.map((stage) => stage.Key)).size === stages.length,
      message: `Up to ${STAGE_LIST_LIMIT} stages, each with a unique key`,
    },
  };
}

export function stageHistoryField() {
  return {
    type: [stageHistorySchema],
    default: [],
    validate: { validator: (entries) => entries.length <= STAGE_HISTORY_LIMIT, message: `Up to ${STAGE_HISTORY_LIMIT} entries` },
  };
}
