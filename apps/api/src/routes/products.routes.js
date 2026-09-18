import { Router } from 'express';
import { z } from 'zod';
import { PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { ProductModel } from '../models/index.js';

const MAX_PUBLIC_PRODUCTS = 200;

export const PUBLIC_PRODUCT_LIST_FIELDS = 'Slug Title Category ServiceCategory Summary Inclusions TurnaroundText PricePaise CompareAtPricePaise GovernmentFeeNote SortOrder';
const PUBLIC_PRODUCT_FIELDS = `${PUBLIC_PRODUCT_LIST_FIELDS} DocumentsRequired FaqItems updatedAt`;

const listQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORY_KEYS).optional(),
});

export const productsRouter = Router();

productsRouter.get('/', async (req, res) => {
  const { category } = listQuerySchema.parse(req.query);
  const filter = { IsPublished: true };
  if (category) filter.Category = category;

  const products = await ProductModel.find(filter)
    .select(PUBLIC_PRODUCT_LIST_FIELDS)
    .sort({ SortOrder: 1 })
    .limit(MAX_PUBLIC_PRODUCTS)
    .lean();
  res.json({ products });
});

productsRouter.get('/:slug', async (req, res) => {
  const product = await ProductModel.findOne({ Slug: String(req.params.slug).toLowerCase(), IsPublished: true })
    .select(PUBLIC_PRODUCT_FIELDS)
    .lean();
  if (!product) return res.status(404).json({ error: 'Service not found' });
  res.json({ product });
});
