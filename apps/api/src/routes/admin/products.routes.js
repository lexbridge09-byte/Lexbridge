import { Router } from 'express';
import { z } from 'zod';
import { PRODUCT_CATEGORY_KEYS, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';
import { OrderModel, PRODUCT_LIST_LIMIT, ProductModel } from '../../models/index.js';
import { createHttpError, deriveSlug, objectIdSchema } from '../../utils.js';

const MAX_ADMIN_PRODUCTS = 500;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const paiseSchema = z.number().int('Use whole paise').min(0).max(100_000_000);
const textListSchema = z.array(z.string().trim().min(1).max(300)).max(PRODUCT_LIST_LIMIT);
const faqItemsSchema = z
  .array(z.object({ Question: z.string().trim().min(3).max(300), Answer: z.string().trim().min(1).max(2000) }))
  .max(PRODUCT_LIST_LIMIT);

const PRODUCT_FIELD_SCHEMAS = {
  Title: z.string().trim().min(3, 'Enter a title').max(160),
  Slug: slugSchema,
  Category: z.enum(PRODUCT_CATEGORY_KEYS, { error: 'Choose a category' }),
  ServiceCategory: z.enum(SERVICE_CATEGORY_KEYS, { error: 'Choose a service area' }),
  Summary: z.string().trim().max(600),
  Inclusions: textListSchema,
  DocumentsRequired: textListSchema,
  TurnaroundText: z.string().trim().max(120),
  PricePaise: paiseSchema,
  CompareAtPricePaise: paiseSchema.nullable(),
  GovernmentFeeNote: z.string().trim().max(300),
  IsPublished: z.boolean(),
  SortOrder: z.number().int().min(-100_000).max(100_000),
  FaqItems: faqItemsSchema,
};

const createProductSchema = z.object({
  ...PRODUCT_FIELD_SCHEMAS,
  Slug: slugSchema.or(z.literal('')).optional(),
  Summary: PRODUCT_FIELD_SCHEMAS.Summary.default(''),
  Inclusions: textListSchema.default([]),
  DocumentsRequired: textListSchema.default([]),
  TurnaroundText: PRODUCT_FIELD_SCHEMAS.TurnaroundText.default(''),
  CompareAtPricePaise: paiseSchema.nullable().default(null),
  GovernmentFeeNote: PRODUCT_FIELD_SCHEMAS.GovernmentFeeNote.default(''),
  IsPublished: z.boolean().default(false),
  SortOrder: PRODUCT_FIELD_SCHEMAS.SortOrder.default(0),
  FaqItems: faqItemsSchema.default([]),
});

// No defaults, so omitted fields are left unchanged
const updateProductSchema = z
  .object(Object.fromEntries(Object.entries(PRODUCT_FIELD_SCHEMAS).map(([field, schema]) => [field, schema.optional()])))
  .refine((input) => Object.values(input).some((value) => value !== undefined), 'Nothing to update');

const listQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORY_KEYS).optional(),
  published: z.enum(['true', 'false']).optional(),
});

function rethrowDuplicateSlug(err) {
  if (err?.code === 11000) throw createHttpError(409, 'A service with this slug already exists. Choose a different slug.');
  throw err;
}

export const adminProductsRouter = Router();

adminProductsRouter.get('/', async (req, res) => {
  const { category, published } = listQuerySchema.parse(req.query);
  const filter = {};
  if (category) filter.Category = category;
  if (published) filter.IsPublished = published === 'true';

  const products = await ProductModel.find(filter)
    .select('Slug Title Category ServiceCategory PricePaise CompareAtPricePaise IsPublished SortOrder updatedAt')
    .sort({ updatedAt: -1 })
    .limit(MAX_ADMIN_PRODUCTS)
    .lean();
  res.json({ products });
});

adminProductsRouter.post('/', async (req, res) => {
  const input = createProductSchema.parse(req.body);
  const slug = input.Slug || deriveSlug(input.Title);
  if (!slug) return res.status(400).json({ error: 'Add a slug using letters or numbers.' });

  const product = await ProductModel.create({ ...input, Slug: slug }).catch(rethrowDuplicateSlug);
  res.status(201).json({ product });
});

adminProductsRouter.get('/:id', async (req, res) => {
  const product = await ProductModel.findById(objectIdSchema.parse(req.params.id)).lean();
  if (!product) return res.status(404).json({ error: 'Service not found' });
  res.json({ product });
});

adminProductsRouter.patch('/:id', async (req, res) => {
  const input = updateProductSchema.parse(req.body);
  const product = await ProductModel.findById(objectIdSchema.parse(req.params.id));
  if (!product) return res.status(404).json({ error: 'Service not found' });

  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) product[field] = value;
  }
  await product.save().catch(rethrowDuplicateSlug);
  res.json({ product });
});

// Products that appear on orders are kept for the record; unpublish them instead
adminProductsRouter.delete('/:id', async (req, res) => {
  const productId = objectIdSchema.parse(req.params.id);
  if (await OrderModel.exists({ 'Items.Product': productId })) {
    return res.status(409).json({ error: 'This service has orders. Unpublish it instead of deleting it.' });
  }
  const result = await ProductModel.deleteOne({ _id: productId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Service not found' });
  res.json({ ok: true });
});
