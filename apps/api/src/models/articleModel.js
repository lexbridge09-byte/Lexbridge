import mongoose from 'mongoose';
import { ARTICLE_STATUSES, ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';

const articleSchema = new mongoose.Schema(
  {
    Slug: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    Title: { type: String, required: true, trim: true, maxlength: 200 },
    Summary: { type: String, trim: true, default: '', maxlength: 400 },
    Topic: { type: String, enum: ARTICLE_TOPIC_KEYS, required: true },
    // Markdown; rendered by the web app without raw HTML
    Body: { type: String, default: '', maxlength: 100_000 },
    Status: { type: String, enum: ARTICLE_STATUSES, default: 'draft' },
    Author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'articles' },
);

articleSchema.index({ Status: 1, publishedAt: -1 });
articleSchema.index({ Topic: 1, Status: 1, publishedAt: -1 });
articleSchema.index({ updatedAt: -1 });

export const ArticleModel = mongoose.model('Article', articleSchema);
