import mongoose from 'mongoose';
import { PRODUCT_CATEGORY_KEYS, SERVICE_CATEGORY_KEYS } from '@lexbridge/shared';

export const PRODUCT_LIST_LIMIT = 20;

const faqItemSchema = new mongoose.Schema(
  {
    Question: { type: String, required: true, trim: true, maxlength: 300 },
    Answer: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false },
);

const boundedTextList = {
  type: [{ type: String, trim: true, maxlength: 300 }],
  default: [],
  validate: { validator: (entries) => entries.length <= PRODUCT_LIST_LIMIT, message: `Up to ${PRODUCT_LIST_LIMIT} entries` },
};

// A fixed-price service that can be bought online
const productSchema = new mongoose.Schema(
  {
    Slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
    Title: { type: String, required: true, trim: true, maxlength: 160 },
    Category: { type: String, enum: PRODUCT_CATEGORY_KEYS, required: true },
    // Which service area the resulting request is filed under
    ServiceCategory: { type: String, enum: SERVICE_CATEGORY_KEYS, required: true },
    Summary: { type: String, trim: true, default: '', maxlength: 600 },
    Inclusions: boundedTextList,
    DocumentsRequired: boundedTextList,
    TurnaroundText: { type: String, trim: true, default: '', maxlength: 120 },
    PricePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: { validator: Number.isInteger, message: 'Price must be a whole number of paise' },
    },
    CompareAtPricePaise: {
      type: Number,
      min: 0,
      default: null,
      validate: { validator: (value) => value === null || Number.isInteger(value), message: 'Price must be a whole number of paise' },
    },
    GovernmentFeeNote: { type: String, trim: true, default: '', maxlength: 300 },
    IsPublished: { type: Boolean, default: false },
    SortOrder: { type: Number, default: 0 },
    FaqItems: {
      type: [faqItemSchema],
      default: [],
      validate: { validator: (entries) => entries.length <= PRODUCT_LIST_LIMIT, message: `Up to ${PRODUCT_LIST_LIMIT} questions` },
    },
  },
  { timestamps: true, collection: 'products' },
);

productSchema.index({ IsPublished: 1, Category: 1, SortOrder: 1 });
productSchema.index({ IsPublished: 1, SortOrder: 1 });
productSchema.index({ updatedAt: -1 });

export const ProductModel = mongoose.model('Product', productSchema);
