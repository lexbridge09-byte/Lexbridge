// Admins type rupees; the API stores whole paise

// "499" -> 49900, "499.5" -> 49950, "" -> null, anything else -> NaN
export function rupeesToPaise(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return Number.NaN;
  return Math.round(Number(trimmed) * 100);
}

// 49950 -> "499.5"; null -> ""
export function paiseToRupeesInput(paise) {
  return Number.isFinite(paise) ? String(paise / 100) : '';
}
