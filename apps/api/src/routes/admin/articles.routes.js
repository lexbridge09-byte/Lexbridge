import { Router } from 'express';
import { z } from 'zod';
import { ARTICLE_STATUSES, ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';
import { ArticleModel } from '../../models/index.js';
import { deriveSlug, objectIdSchema } from '../../utils.js';

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens');

const createArticleSchema = z.object({
  Title: z.string().trim().min(3, 'Enter a title').max(200),
  Slug: slugSchema.or(z.literal('')).optional(),
  Summary: z.string().trim().max(400).default(''),
  Topic: z.enum(ARTICLE_TOPIC_KEYS, { error: 'Choose a topic' }),
  Body: z.string().max(100_000).default(''),
  Status: z.enum(ARTICLE_STATUSES).default('draft'),
});

// No defaults, so omitted fields are left unchanged
const updateArticleSchema = z.object({
  Title: z.string().trim().min(3).max(200).optional(),
  Slug: slugSchema.optional(),
  Summary: z.string().trim().max(400).optional(),
  Topic: z.enum(ARTICLE_TOPIC_KEYS).optional(),
  Body: z.string().max(100_000).optional(),
  Status: z.enum(ARTICLE_STATUSES).optional(),
});

const listQuerySchema = z.object({
  status: z.enum(ARTICLE_STATUSES).optional(),
});

function rethrowDuplicateSlug(err) {
  if (err?.code === 11000) {
    const error = new Error('An article with this slug already exists. Choose a different slug.');
    error.status = 409;
    error.expose = true;
    throw error;
  }
  throw err;
}

export const adminArticlesRouter = Router();

adminArticlesRouter.get('/', async (req, res) => {
  const { status } = listQuerySchema.parse(req.query);
  const articles = await ArticleModel.find(status ? { Status: status } : {})
    .select('Slug Title Summary Topic Status publishedAt createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean();
  res.json({ articles });
});

adminArticlesRouter.post('/', async (req, res) => {
  const input = createArticleSchema.parse(req.body);
  const slug = input.Slug || deriveSlug(input.Title);
  if (!slug) return res.status(400).json({ error: 'Add a slug using letters or numbers.' });

  const article = await ArticleModel.create({
    ...input,
    Slug: slug,
    Author: req.user.id,
    publishedAt: input.Status === 'published' ? new Date() : null,
  }).catch(rethrowDuplicateSlug);
  res.status(201).json({ article });
});

adminArticlesRouter.get('/:id', async (req, res) => {
  const article = await ArticleModel.findById(objectIdSchema.parse(req.params.id)).lean();
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json({ article });
});

adminArticlesRouter.patch('/:id', async (req, res) => {
  const input = updateArticleSchema.parse(req.body);
  const article = await ArticleModel.findById(objectIdSchema.parse(req.params.id));
  if (!article) return res.status(404).json({ error: 'Article not found' });

  for (const [field, value] of Object.entries(input)) {
    if (value !== undefined) article[field] = value;
  }
  if (article.Status === 'published' && !article.publishedAt) article.publishedAt = new Date();

  await article.save().catch(rethrowDuplicateSlug);
  res.json({ article });
});

adminArticlesRouter.delete('/:id', async (req, res) => {
  const result = await ArticleModel.deleteOne({ _id: objectIdSchema.parse(req.params.id) });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Article not found' });
  res.json({ ok: true });
});
