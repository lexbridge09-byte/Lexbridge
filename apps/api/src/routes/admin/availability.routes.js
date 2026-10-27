import { Router } from 'express';
import { z } from 'zod';
import { APP_UTC_OFFSET } from '@lexbridge/shared';
import { CALENDLY_TOKEN } from '../../config/index.js';
import { AvailabilityModel, BOOKING_PROVIDERS, SlotModel } from '../../models/index.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_PUBLISHED_SLOTS = 2000;

const rangeSchema = z
  .object({ From: z.string().regex(TIME_PATTERN), To: z.string().regex(TIME_PATTERN) })
  .refine((range) => range.From < range.To, 'Each range must end after it starts');

const availabilitySchema = z.object({
  Weekly: z.array(z.object({ Weekday: z.number().int().min(0).max(6), Ranges: z.array(rangeSchema).max(6) })).max(7),
  Overrides: z
    .array(z.object({ Date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), Ranges: z.array(rangeSchema).max(6) }))
    .max(120)
    .default([]),
  DurationMinutes: z.coerce.number().int().min(10).max(240),
  Capacity: z.coerce.number().int().min(1).max(50).default(1),
  PublishWeeks: z.coerce.number().int().min(1).max(12),
  Provider: z.enum(BOOKING_PROVIDERS),
  CalendlyUrl: z
    .string()
    .trim()
    .max(300)
    .refine((url) => !url || /^https:\/\/calendly\.com\/[\w-]+(\/[\w-]+)?\/?$/.test(url), 'Use a link like https://calendly.com/your-name/30min'),
});

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

// Every slot start (as a Date) the weekly hours produce over the next `weeks` weeks, future only
export function deriveScheduledStarts({ Weekly, Overrides = [], DurationMinutes, PublishWeeks }, now = Date.now()) {
  const rangesByWeekday = new Map(Weekly.map((day) => [day.Weekday, day.Ranges]));
  // A date override replaces that day's weekly hours (no ranges = unavailable all day)
  const rangesByDate = new Map(Overrides.map((override) => [override.Date, override.Ranges]));
  const todayKey = new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
  const firstDay = new Date(`${todayKey}T00:00:00Z`).getTime();
  const starts = [];
  for (let offset = 0; offset < PublishWeeks * 7; offset += 1) {
    const day = new Date(firstDay + offset * DAY_MS);
    const dateKey = day.toISOString().slice(0, 10);
    const ranges = rangesByDate.get(dateKey) ?? rangesByWeekday.get(day.getUTCDay()) ?? [];
    for (const range of ranges) {
      for (let minute = toMinutes(range.From); minute + DurationMinutes <= toMinutes(range.To); minute += DurationMinutes) {
        const startsAt = new Date(`${dateKey}T${toTime(minute)}:00${APP_UTC_OFFSET}`);
        if (startsAt.getTime() > now) starts.push(startsAt);
      }
    }
  }
  return starts.slice(0, MAX_PUBLISHED_SLOTS);
}

async function loadAvailability() {
  return (
    (await AvailabilityModel.findOne({ Key: 'default' }).lean()) ??
    { Weekly: [], Overrides: [], DurationMinutes: 30, Capacity: 1, PublishWeeks: 8, Provider: 'builtin', CalendlyUrl: '' }
  );
}

export const adminAvailabilityRouter = Router();

adminAvailabilityRouter.get('/', async (req, res) => {
  // isCalendlyReady: the server can verify Calendly bookings (CALENDLY_TOKEN is set)
  res.json({ availability: await loadAvailability(), isCalendlyReady: Boolean(CALENDLY_TOKEN) });
});

/*
  Keeps bookable slots equal to the schedule over the rolling window: creates the times it adds and
  removes open, unbooked future times it no longer has. Booked slots are never touched.
*/
async function syncSlotsWithSchedule(availability) {
  const now = Date.now();
  const starts = deriveScheduledStarts(availability, now);
  const wanted = new Set(starts.map((startsAt) => startsAt.getTime()));
  const windowEnd = new Date(now + availability.PublishWeeks * 7 * DAY_MS);

  const created = starts.length
    ? (
        await SlotModel.bulkWrite(
          starts.map((startsAt) => ({
            updateOne: {
              filter: { StartsAt: startsAt },
              update: {
                $setOnInsert: { DurationMinutes: availability.DurationMinutes, Status: 'open', Consultation: null, Consultations: [], BookedCount: 0 },
              },
              upsert: true,
            },
          })),
          { ordered: false },
        )
      ).upsertedCount
    : 0;

  // Apply the current team size to every future time in the window; a time is open while seats remain
  const capacity = availability.Capacity ?? 1;
  await SlotModel.updateMany(
    { StartsAt: { $gt: new Date(now), $lte: windowEnd }, Status: { $in: ['open', 'booked'] } },
    [
      {
        $set: {
          Capacity: { $max: [capacity, { $ifNull: ['$BookedCount', 0] }] },
          Status: { $cond: [{ $gte: [{ $ifNull: ['$BookedCount', 0] }, capacity] }, 'booked', 'open'] },
        },
      },
    ],
    { updatePipeline: true },
  );

  // Only times with no booking at all may be removed
  const openInWindow = await SlotModel.find({
    Status: 'open',
    Consultation: null,
    $or: [{ BookedCount: 0 }, { BookedCount: { $exists: false } }],
    StartsAt: { $gt: new Date(now), $lte: windowEnd },
  })
    .select('_id StartsAt')
    .lean();
  const staleIds = openInWindow.filter((slot) => !wanted.has(new Date(slot.StartsAt).getTime())).map((slot) => slot._id);
  const removed = staleIds.length ? (await SlotModel.deleteMany({ _id: { $in: staleIds }, Status: 'open' })).deletedCount : 0;
  return { created, removed, bookable: starts.length };
}

adminAvailabilityRouter.put('/', async (req, res) => {
  const input = availabilitySchema.parse(req.body);
  if (input.Provider === 'calendly' && !input.CalendlyUrl) {
    return res.status(400).json({ error: 'Add your Calendly link to use Calendly.' });
  }
  // Past overrides are archived automatically (dropped on save)
  const todayKey = new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
  input.Overrides = input.Overrides.filter((override) => override.Date >= todayKey).sort((a, b) => a.Date.localeCompare(b.Date));
  const availability = await AvailabilityModel.findOneAndUpdate(
    { Key: 'default' },
    { $set: input },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  ).lean();
  const sync = input.Provider === 'builtin' ? await syncSlotsWithSchedule(availability) : null;
  res.json({ availability, sync });
});

// Publish: turn the saved weekly hours into open slots for the next PublishWeeks weeks (one bulk write;
// existing slots at the same start are left untouched, so publishing twice is harmless)
adminAvailabilityRouter.post('/publish', async (req, res) => {
  const availability = await loadAvailability();
  const starts = deriveScheduledStarts(availability);
  if (starts.length === 0) return res.json({ created: 0, skipped: 0 });
  const result = await SlotModel.bulkWrite(
    starts.map((startsAt) => ({
      updateOne: {
        filter: { StartsAt: startsAt },
        update: { $setOnInsert: { DurationMinutes: availability.DurationMinutes, Status: 'open', Consultation: null } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  res.json({ created: result.upsertedCount, skipped: starts.length - result.upsertedCount });
});
