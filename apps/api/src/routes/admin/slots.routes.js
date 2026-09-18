import { Router } from 'express';
import { z } from 'zod';
import { APP_UTC_OFFSET } from '@lexbridge/shared';
import { SlotModel } from '../../models/index.js';
import { objectIdSchema } from '../../utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const listQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const createSlotsSchema = z.object({
  Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD'),
  StartTimes: z
    .array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour times like 09:30'))
    .min(1, 'Add at least one start time')
    .max(48),
  DurationMinutes: z.coerce.number().int().min(10).max(240),
});

export const adminSlotsRouter = Router();

adminSlotsRouter.get('/', async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const from = query.from ?? new Date(Date.now() - DAY_MS);
  const to = query.to ?? new Date(from.getTime() + 31 * DAY_MS);

  const slots = await SlotModel.find({ StartsAt: { $gte: from, $lte: to } })
    .select('StartsAt DurationMinutes Status Consultation')
    .populate('Consultation', 'ReferenceCode Status Mode')
    .sort({ StartsAt: 1 })
    .limit(1000)
    .lean();
  res.json({ slots });
});

// Times are IST wall-clock; duplicates and past times are skipped
adminSlotsRouter.post('/', async (req, res) => {
  const input = createSlotsSchema.parse(req.body);
  const now = Date.now();

  const startsAts = [...new Set(input.StartTimes)]
    .map((time) => new Date(`${input.Date}T${time}:00${APP_UTC_OFFSET}`))
    .filter((startsAt) => !Number.isNaN(startsAt.getTime()));
  if (startsAts.length === 0) return res.status(400).json({ error: 'That date is not valid.' });

  const futureStartsAts = startsAts.filter((startsAt) => startsAt.getTime() > now);
  let created = 0;
  if (futureStartsAts.length > 0) {
    const result = await SlotModel.bulkWrite(
      futureStartsAts.map((startsAt) => ({
        updateOne: {
          filter: { StartsAt: startsAt },
          update: { $setOnInsert: { DurationMinutes: input.DurationMinutes, Status: 'open', Consultation: null } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    created = result.upsertedCount;
  }

  res.status(201).json({ created, skipped: input.StartTimes.length - created });
});

adminSlotsRouter.delete('/:id', async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const result = await SlotModel.deleteOne({ _id: id, Status: { $in: ['open', 'blocked'] } });
  if (result.deletedCount === 0) {
    const exists = await SlotModel.exists({ _id: id });
    if (!exists) return res.status(404).json({ error: 'Slot not found' });
    return res.status(409).json({ error: "Booked slots can't be deleted. Cancel the consultation first." });
  }
  res.json({ ok: true });
});
