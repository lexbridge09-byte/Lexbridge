import { PAID_ORDER_STATUSES } from '@lexbridge/shared';
import { CouponModel, OrderModel } from '../models/index.js';
import { createHttpError, formatRupees } from '../utils.js';

export function normalizeCouponCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

function sumPaise(items) {
  return items.reduce((total, item) => total + item.PricePaise, 0);
}

/*
  Checks a coupon against priced order items and returns { coupon, discountPaise }.
  Category-limited coupons only discount the items in those categories. Throws a 400 with a readable reason.
*/
export async function evaluateCoupon({ code, items, email }) {
  const couponCode = normalizeCouponCode(code);
  const coupon = couponCode ? await CouponModel.findOne({ Code: couponCode }).lean() : null;
  const now = new Date();

  if (!coupon || !coupon.IsActive) throw createHttpError(400, 'This coupon code is not valid.');
  if (coupon.StartsAt && coupon.StartsAt > now) throw createHttpError(400, 'This coupon is not active yet.');
  if (coupon.EndsAt && coupon.EndsAt <= now) throw createHttpError(400, 'This coupon has expired.');
  if (coupon.MaxRedemptions > 0 && coupon.RedemptionCount >= coupon.MaxRedemptions) {
    throw createHttpError(400, 'This coupon has been fully used.');
  }

  const subtotalPaise = sumPaise(items);
  if (subtotalPaise < coupon.MinOrderPaise) {
    throw createHttpError(400, `This coupon needs a minimum order of ${formatRupees(coupon.MinOrderPaise)}.`);
  }

  const eligibleItems = coupon.AppliesToCategories.length === 0
    ? items
    : items.filter((item) => coupon.AppliesToCategories.includes(item.Category));
  if (eligibleItems.length === 0) throw createHttpError(400, "This coupon doesn't apply to the selected services.");

  if (coupon.PerUserLimit > 0 && email) {
    const usedCount = await OrderModel.countDocuments({
      CouponCode: couponCode,
      Email: String(email).trim().toLowerCase(),
      Status: { $in: PAID_ORDER_STATUSES },
    });
    if (usedCount >= coupon.PerUserLimit) throw createHttpError(400, "You've already used this coupon.");
  }

  const eligiblePaise = sumPaise(eligibleItems);
  let discountPaise = coupon.Type === 'percent' ? Math.floor((eligiblePaise * coupon.Value) / 100) : coupon.Value;
  if (coupon.MaxDiscountPaise > 0) discountPaise = Math.min(discountPaise, coupon.MaxDiscountPaise);
  discountPaise = Math.min(discountPaise, eligiblePaise);

  return { coupon, discountPaise };
}

// Counts one redemption when an order is paid. Returns false if the coupon ran out in the meantime.
export async function redeemCoupon(couponId) {
  const updated = await CouponModel.findOneAndUpdate(
    { _id: couponId, $or: [{ MaxRedemptions: 0 }, { $expr: { $lt: ['$RedemptionCount', '$MaxRedemptions'] } }] },
    { $inc: { RedemptionCount: 1 } },
    { projection: { _id: 1 } },
  ).lean();
  return Boolean(updated);
}
