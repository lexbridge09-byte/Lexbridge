import mongoose from 'mongoose';
import { REFERRAL_STATUSES } from '@lexbridge/shared';

// Each client's shareable code. The code is also a coupon (Coupon.ReferralOwner) that gives the friend a discount.
const referralProfileSchema = new mongoose.Schema(
  {
    User: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Code: { type: String, required: true, uppercase: true, trim: true, maxlength: 40 },
    Coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  },
  { timestamps: true, collection: 'referralProfiles' },
);

referralProfileSchema.index({ User: 1 }, { unique: true });
referralProfileSchema.index({ Code: 1 }, { unique: true });

// A friend's first paid order that used a referral code, and the reward the referrer got for it
const referralSchema = new mongoose.Schema(
  {
    Referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ReferralCode: { type: String, required: true, maxlength: 40 },
    ReferredEmail: { type: String, required: true, lowercase: true, trim: true },
    ReferredPhoneLast10: { type: String, default: '' },
    ReferredUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    Order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    OrderReference: { type: String, required: true },
    Status: { type: String, enum: REFERRAL_STATUSES, required: true },
    RejectReason: { type: String, default: '', maxlength: 120 },
    RewardCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    RewardCode: { type: String, default: '' },
    rewardedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'referrals' },
);

referralSchema.index({ Order: 1 }, { unique: true });
// One reward per referred person, however many codes they try
referralSchema.index({ ReferredEmail: 1 }, { unique: true, partialFilterExpression: { Status: 'rewarded' } });
referralSchema.index({ Referrer: 1, createdAt: -1 });
referralSchema.index({ Status: 1, createdAt: -1 });

export const ReferralProfileModel = mongoose.model('ReferralProfile', referralProfileSchema);
export const ReferralModel = mongoose.model('Referral', referralSchema);
