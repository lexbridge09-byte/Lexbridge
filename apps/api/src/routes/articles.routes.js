import { Router } from 'express';
import { z } from 'zod';
import { ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';
import { ArticleModel } from '../models/index.js';

const listQuerySchema = z.object({
  topic: z.enum(ARTICLE_TOPIC_KEYS).optional(),
});

export const articlesRouter = Router();

articlesRouter.get('/', async (req, res) => {
  const { topic } = listQuerySchema.parse(req.query);
  const filter = { Status: 'published' };
  if (topic) filter.Topic = topic;

  const articles = await ArticleModel.find(filter)
    .select('Slug Title Summary Topic publishedAt')
    .sort({ publishedAt: -1 })
    .limit(200)
    .lean();
  res.json({ articles });
});

articlesRouter.get('/:slug', async (req, res) => {
  const article = await ArticleModel.findOne({ Slug: String(req.params.slug).toLowerCase(), Status: 'published' })
    .select('Slug Title Summary Topic Body publishedAt updatedAt')
    .lean();
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json({ article });
});
