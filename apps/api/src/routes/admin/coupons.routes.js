import { Router } from 'express';
import { z } from 'zod';
import { COUPON_TYPES, PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { CouponModel } from '../../models/index.js';
import { createHttpError, objectIdSchema } from '../../utils.js';

const MAX_ADMIN_COUPONS = 500;

const COUPON_FIELD_SCHEMAS = {
  Code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, 'Use 3–40 letters, numbers, hyphens or underscores'),
  Description: z.string().trim().max(300),
  Type: z.enum(COUPON_TYPES),
  Value: z.number().int().min(1),
  MaxDiscountPaise: z.number().int().min(0),
  MinOrderPaise: z.number().int().min(0),
  StartsAt: z.coerce.date().nullable(),
  EndsAt: z.coerce.date().nullable(),
  MaxRedemptions: z.number().int().min(0),
  PerUserLimit: z.number().int().min(0),
  AppliesToCategories: z.array(z.enum(PRODUCT_CATEGORY_KEYS)).max(PRODUCT_CATEGORY_KEYS.length),
  IsActive: z.boolean(),
};

function hasValidRules(coupon) {
  return !(coupon.Type === 'percent' && coupon.Value > 100)
    && !(coupon.StartsAt && coupon.EndsAt && coupon.EndsAt <= coupon.StartsAt);
}
const RULES_MESSAGE = 'Check the rules: a percentage is at most 100 and the end date must be after the start date.';

const createCouponSchema = z
  .object({
    ...COUPON_FIELD_SCHEMAS,
    Description: COUPON_FIELD_SCHEMAS.Description.default(''),
    MaxDiscountPaise: COUPON_FIELD_SCHEMAS.MaxDiscountPaise.default(0),
    MinOrderPaise: COUPON_FIELD_SCHEMAS.MinOrderPaise.default(0),
    StartsAt: COUPON_FIELD_SCHEMAS.StartsAt.default(null),
    EndsAt: COUPON_FIELD_SCHEMAS.EndsAt.default(null),
    MaxRedemptions: COUPON_FIELD_SCHEMAS.MaxRedemptions.default(0),
    PerUserLimit: COUPON_FIELD_SCHEMAS.PerUserLimit.default(0),
    AppliesToCategories: COUPON_FIELD_SCHEMAS.AppliesToCategories.default([]),
    IsActive: z.boolean().default(true),
  })
  .refine(hasValidRules, RULES_MESSAGE);

const updateCouponSchema = z
  .object(Object.fromEntries(Object.entries(COUPON_FIELD_SCHEMAS).map(([field, schema]) => [field, schema.optional()])))
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

function rethrowDuplicateCode(err) {
  if (err?.code === 11000) throw createHttpError(409, 'A coupon with this code already exists.');
  throw err;
}

export const adminCouponsRouter = Router();

adminCouponsRouter.get('/', async (req, res) => {
  const coupons = await CouponModel.find().sort({ updatedAt: -1 }).limit(MAX_ADMIN_COUPONS).lean();
  res.json({ coupons });
});

adminCouponsRouter.post('/', async (req, res) => {
  const input = createCouponSchema.parse(req.body);
  const coupon = await CouponModel.create(input).catch(rethrowDuplicateCode);
  res.status(201).json({ coupon });
});

adminCouponsRouter.get('/:id', async (req, res) => {
  const coupon = await CouponModel.findById(objectIdSchema.parse(req.params.id)).lean();
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ coupon });
});

adminCouponsRouter.patch('/:id', async (req, res) => {
  const input = updateCouponSchema.parse(req.body);
  const coupon = await CouponModel.findById(objectIdSchema.parse(req.params.id));
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });

  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) coupon[field] = value;
  }
  if (!hasValidRules(coupon)) throw createHttpError(400, RULES_MESSAGE);
  await coupon.save().catch(rethrowDuplicateCode);
  res.json({ coupon });
});

// Used coupons stay for order history; deactivate them instead
adminCouponsRouter.delete('/:id', async (req, res) => {
  const coupon = await CouponModel.findById(objectIdSchema.parse(req.params.id)).select('RedemptionCount').lean();
  if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
  if (coupon.RedemptionCount > 0) {
    return res.status(409).json({ error: 'This coupon has been used. Deactivate it instead of deleting it.' });
  }
  await CouponModel.deleteOne({ _id: coupon._id });
  res.json({ ok: true });
});
