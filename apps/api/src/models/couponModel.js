import mongoose from 'mongoose';
import { COUPON_TYPES, PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';

const couponSchema = new mongoose.Schema(
  {
    Code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 40 },
    Description: { type: String, trim: true, default: '', maxlength: 300 },
    Type: { type: String, enum: COUPON_TYPES, required: true },
    // percent: 1–100; flat: paise
    Value: { type: Number, required: true, min: 1 },
    // 0 means no cap
    MaxDiscountPaise: { type: Number, default: 0, min: 0 },
    MinOrderPaise: { type: Number, default: 0, min: 0 },
    StartsAt: { type: Date, default: null },
    EndsAt: { type: Date, default: null },
    // 0 means unlimited
    MaxRedemptions: { type: Number, default: 0, min: 0 },
    PerUserLimit: { type: Number, default: 0, min: 0 },
    // Empty means every category
    AppliesToCategories: { type: [{ type: String, enum: PRODUCT_CATEGORY_KEYS }], default: [] },
    IsActive: { type: Boolean, default: true },
    // Counted when an order using the coupon is paid, not when checkout starts
    RedemptionCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'coupons' },
);

couponSchema.pre('validate', function checkPercentValue() {
  if (this.Type === 'percent' && this.Value > 100) this.invalidate('Value', 'A percentage discount can be at most 100');
});

couponSchema.index({ updatedAt: -1 });

export const CouponModel = mongoose.model('Coupon', couponSchema);
