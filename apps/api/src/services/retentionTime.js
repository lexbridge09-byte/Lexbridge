import { QUIET_HOURS_END, QUIET_HOURS_START } from '../config/index.js';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
const IST_OFFSET_MS = 5.5 * HOUR_MS;

const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });

export function addHours(date, hours) {
  return new Date(new Date(date).getTime() + hours * HOUR_MS);
}

export function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * DAY_MS);
}

export function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function daysUntil(date, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - now.getTime()) / DAY_MS));
}

export function getIstHour(date) {
  return new Date(new Date(date).getTime() + IST_OFFSET_MS).getUTCHours();
}

// Quiet hours can wrap past midnight (21:00–09:00 by default). Equal start and end means no quiet hours.
export function isQuietHour(date) {
  if (QUIET_HOURS_START === QUIET_HOURS_END) return false;
  const hour = getIstHour(date);
  return QUIET_HOURS_START > QUIET_HOURS_END
    ? hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END
    : hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
}

// The next moment quiet hours end, in India time
export function deriveQuietHoursEnd(date) {
  const time = new Date(date).getTime();
  const ist = new Date(time + IST_OFFSET_MS);
  const endToday = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), QUIET_HOURS_END) - IST_OFFSET_MS;
  return new Date(endToday > time ? endToday : endToday + DAY_MS);
}

export function formatIstDate(date) {
  return IST_DATE_FORMATTER.format(new Date(date));
}
