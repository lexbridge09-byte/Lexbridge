import { Router } from 'express';
import { z } from 'zod';
import { APP_UTC_OFFSET } from '@lexbridge/shared';
import { SlotModel } from '../../models/index.js';
import { objectIdSchema } from '../../utils.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// APP_UTC_OFFSET is '+05:30'; slots are IST wall-clock times
const IST_OFFSET_MS = 330 * 60 * 1000;

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
  // Optional weekly repeat: the same times on these weekdays (0 = Sunday) for this many weeks from Date
  RepeatWeeks: z.coerce.number().int().min(1).max(12).default(1),
  Weekdays: z.array(z.coerce.number().int().min(0).max(6)).max(7).optional(),
});

const clearDaySchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD') });

// IST calendar dates covered by a create request: just Date, or every chosen weekday across RepeatWeeks weeks
function deriveSlotDates(input) {
  const start = new Date(`${input.Date}T00:00:00${APP_UTC_OFFSET}`);
  if (Number.isNaN(start.getTime())) return [];
  const weekdays = input.Weekdays?.length ? new Set(input.Weekdays) : null;
  const dayCount = weekdays ? input.RepeatWeeks * 7 : 1;
  const dates = [];
  for (let offset = 0; offset < dayCount; offset += 1) {
    const day = new Date(start.getTime() + offset * DAY_MS);
    // Weekday in IST: shift by the offset so the date string is the IST calendar date
    const istDate = new Date(day.getTime() + IST_OFFSET_MS);
    if (weekdays && !weekdays.has(istDate.getUTCDay())) continue;
    dates.push(istDate.toISOString().slice(0, 10));
  }
  return dates;
}

export const adminSlotsRouter = Router();

adminSlotsRouter.get('/', async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const from = query.from ?? new Date(Date.now() - DAY_MS);
  const to = query.to ?? new Date(from.getTime() + 31 * DAY_MS);

  const slots = await SlotModel.find({ StartsAt: { $gte: from, $lte: to } })
    .select('StartsAt DurationMinutes Status Capacity BookedCount Consultation Consultations')
    .populate('Consultation', 'ReferenceCode Status Mode')
    .populate('Consultations', 'ReferenceCode Status Mode')
    .sort({ StartsAt: 1 })
    .limit(1000)
    .lean();
  res.json({ slots });
});

// Times are IST wall-clock; duplicates and past times are skipped
adminSlotsRouter.post('/', async (req, res) => {
  const input = createSlotsSchema.parse(req.body);
  const now = Date.now();

  const times = [...new Set(input.StartTimes)];
  const startsAts = deriveSlotDates(input)
    .flatMap((date) => times.map((time) => new Date(`${date}T${time}:00${APP_UTC_OFFSET}`)))
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

  res.status(201).json({ created, skipped: startsAts.length - created });
});

// Clear a day: removes its open/blocked slots in one call; booked slots are never touched
adminSlotsRouter.delete('/', async (req, res) => {
  const { date } = clearDaySchema.parse(req.query);
  const dayStart = new Date(`${date}T00:00:00${APP_UTC_OFFSET}`);
  const result = await SlotModel.deleteMany({
    StartsAt: { $gte: dayStart, $lt: new Date(dayStart.getTime() + DAY_MS) },
    Status: { $in: ['open', 'blocked'] },
    Consultation: null,
    $or: [{ BookedCount: 0 }, { BookedCount: { $exists: false } }],
  });
  res.json({ deleted: result.deletedCount });
});

adminSlotsRouter.delete('/:id', async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const result = await SlotModel.deleteOne({
    _id: id,
    Status: { $in: ['open', 'blocked'] },
    Consultation: null,
    $or: [{ BookedCount: 0 }, { BookedCount: { $exists: false } }],
  });
  if (result.deletedCount === 0) {
    const exists = await SlotModel.exists({ _id: id });
    if (!exists) return res.status(404).json({ error: 'Slot not found' });
    return res.status(409).json({ error: "Booked slots can't be deleted. Cancel the consultation first." });
  }
  res.json({ ok: true });
});
