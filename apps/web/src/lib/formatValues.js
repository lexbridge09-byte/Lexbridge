import { APP_TIME_ZONE } from '@lexbridge/shared';
import { getLocaleTag } from '@/brand/locales';

const DATE_FORMAT_OPTIONS = {
  dateTime: { dateStyle: 'medium', timeStyle: 'short' },
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  day: { weekday: 'long', day: 'numeric', month: 'long' },
  shortDay: { weekday: 'short', day: 'numeric', month: 'short' },
  time: { hour: 'numeric', minute: '2-digit' },
};

const formatterCache = new Map();

function getDateFormatter(kind, locale) {
  const localeTag = getLocaleTag(locale);
  const cacheKey = `${kind}:${localeTag}`;
  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(cacheKey, new Intl.DateTimeFormat(localeTag, { timeZone: APP_TIME_ZONE, ...DATE_FORMAT_OPTIONS[kind] }));
  }
  return formatterCache.get(cacheKey);
}

function formatDateValue(kind, value, locale) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : getDateFormatter(kind, locale).format(date);
}

// en-CA formats as YYYY-MM-DD, which sorts and groups cleanly regardless of display language
const dateKeyFormat = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDateTime = (value, locale) => formatDateValue('dateTime', value, locale);
export const formatDate = (value, locale) => formatDateValue('date', value, locale);
export const formatDay = (value, locale) => formatDateValue('day', value, locale);
export const formatShortDay = (value, locale) => formatDateValue('shortDay', value, locale);
export const formatTime = (value, locale) => formatDateValue('time', value, locale);

export function formatDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateKeyFormat.format(date);
}

export function formatNumber(value, locale) {
  return Number.isFinite(value) ? new Intl.NumberFormat(getLocaleTag(locale)).format(value) : '';
}

export function formatFileSize(bytes, locale) {
  if (!Number.isFinite(bytes)) return '';
  const numberFormat = new Intl.NumberFormat(getLocaleTag(locale), { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${numberFormat.format(bytes)} B`;
  if (bytes < 1024 * 1024) return `${numberFormat.format(Math.round(bytes / 1024))} KB`;
  return `${numberFormat.format(bytes / (1024 * 1024))} MB`;
}

// 19900 -> "₹199"; 19950 -> "₹199.50"
export function formatRupees(paise, locale) {
  if (!Number.isFinite(paise)) return '';
  const rupees = paise / 100;
  return new Intl.NumberFormat(getLocaleTag(locale), {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

// WhatsApp numbers are stored as E.164 digits without '+'
export function formatWhatsAppNumber(phone) {
  return phone ? `+${phone}` : '';
}

// Formatters bound to one locale, for server components and the client hook
export function createFormatters(locale) {
  return {
    dateTime: (value) => formatDateTime(value, locale),
    date: (value) => formatDate(value, locale),
    day: (value) => formatDay(value, locale),
    shortDay: (value) => formatShortDay(value, locale),
    time: (value) => formatTime(value, locale),
    number: (value) => formatNumber(value, locale),
    fileSize: (bytes) => formatFileSize(bytes, locale),
    rupees: (paise) => formatRupees(paise, locale),
  };
}
