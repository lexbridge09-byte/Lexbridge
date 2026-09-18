import { derivePhoneLast10 } from '../utils.js';

function setPhoneLast10OnUpdate() {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;
  if (update.Phone !== undefined) update.PhoneLast10 = derivePhoneLast10(update.Phone);
  for (const operator of ['$set', '$setOnInsert']) {
    if (update[operator]?.Phone !== undefined) {
      update[operator].PhoneLast10 = derivePhoneLast10(update[operator].Phone);
    }
  }
}

// Keeps PhoneLast10 in sync with Phone for document saves and query-style updates
export function applyPhoneLast10Hooks(schema) {
  schema.pre('validate', function setPhoneLast10() {
    this.PhoneLast10 = derivePhoneLast10(this.Phone);
  });
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], setPhoneLast10OnUpdate);
}
