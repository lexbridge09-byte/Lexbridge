import mongoose from 'mongoose';

const BOOKING_PROVIDERS = ['builtin', 'calendly'];

// One time range inside a weekday, 24-hour IST wall clock ("09:00" → "13:00")
const rangeSchema = new mongoose.Schema(
  {
    From: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    To: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  },
  { _id: false },
);

const daySchema = new mongoose.Schema(
  {
    Weekday: { type: Number, required: true, min: 0, max: 6 },
    Ranges: { type: [rangeSchema], default: [] },
  },
  { _id: false },
);

/*
  Single settings document (Key: 'default') — the weekly booking hours (Cal.com/Calendly "weekly hours")
  that publish into concrete slots, plus which booking provider the consultation page uses.
*/
const availabilitySchema = new mongoose.Schema(
  {
    Key: { type: String, required: true, unique: true, default: 'default' },
    Weekly: { type: [daySchema], default: [] },
    // One-off changes for a date (Cal.com "date overrides"): custom hours, or no ranges = unavailable all day
    Overrides: {
      type: [
        new mongoose.Schema(
          { Date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, Ranges: { type: [rangeSchema], default: [] } },
          { _id: false },
        ),
      ],
      default: [],
    },
    DurationMinutes: { type: Number, default: 30, min: 10, max: 240 },
    // Lawyers working at the same time = clients each time can take (Cal.com "seats")
    Capacity: { type: Number, default: 1, min: 1, max: 50 },
    // How far ahead bookable times are kept in sync (rolling window)
    PublishWeeks: { type: Number, default: 8, min: 1, max: 12 },
    Provider: { type: String, enum: BOOKING_PROVIDERS, default: 'builtin' },
    CalendlyUrl: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

export const AvailabilityModel = mongoose.model('Availability', availabilitySchema);
export { BOOKING_PROVIDERS };
