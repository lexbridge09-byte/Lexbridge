import { Router } from 'express';
import { z } from 'zod';
import { CALLBACK_STATUSES } from '@lexbridge/shared';
import { CALLBACK_NOTE_LIMIT, CallbackRequestModel } from '../../models/index.js';
import { derivePhoneLast10, escapeRegex, paginationSchema } from '../../utils.js';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(CALLBACK_STATUSES).optional(),
  q: z.string().trim().max(40).optional(),
});

const updateSchema = z
  .object({
    Status: z.enum(CALLBACK_STATUSES).optional(),
    Note: z.string().trim().max(1000).optional(),
  })
  .refine((input) => input.Status !== undefined || Boolean(input.Note), 'Nothing to update');

// Reference codes match by prefix; anything with 4+ digits matches the phone number
function deriveCallbackSearchFilter(query) {
  if (/^LK-/i.test(query)) return { ReferenceCode: { $regex: `^${escapeRegex(query.toUpperCase())}` } };
  const digits = query.replace(/\D/g, '');
  if (digits.length < 4) return { _id: null };
  return digits.length >= 10 ? { PhoneLast10: derivePhoneLast10(digits) } : { PhoneLast10: { $regex: `^${digits}` } };
}

export const adminCallbacksRouter = Router();

adminCallbacksRouter.get('/', async (req, res) => {
  const { page, limit, status, q } = listQuerySchema.parse(req.query);
  const filter = {};
  if (status) filter.Status = status;
  if (q) Object.assign(filter, deriveCallbackSearchFilter(q));

  const [items, total] = await Promise.all([
    CallbackRequestModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('Notes.ChangedBy', 'FullName Email')
      .lean(),
    CallbackRequestModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminCallbacksRouter.patch('/:referenceCode', async (req, res) => {
  const input = updateSchema.parse(req.body);
  const callback = await CallbackRequestModel.findOne({ ReferenceCode: req.params.referenceCode }).select('Status').lean();
  if (!callback) return res.status(404).json({ error: 'Callback request not found' });

  const status = input.Status ?? callback.Status;
  const updated = await CallbackRequestModel.findOneAndUpdate(
    { _id: callback._id },
    {
      $set: { Status: status },
      $push: {
        Notes: {
          $each: [{ Status: status, Note: input.Note ?? '', ChangedBy: req.user.id, changedAt: new Date() }],
          $slice: -CALLBACK_NOTE_LIMIT,
        },
      },
    },
    { returnDocument: 'after' },
  ).populate('Notes.ChangedBy', 'FullName Email').lean();
  res.json({ callback: updated });
});
