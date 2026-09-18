import { isFeatureEnabled, WHATSAPP_AI_PLAN } from '@lexbridge/shared';
import { formatRupees } from '@/lib/formatValues';

// FAQ entries from the dictionary, minus answers for switched-off features.
// With `ids`, returns just those entries in that order; `limit` caps the count.
export function getFaqItems(dictionary, locale, { ids, limit } = {}) {
  const plan = {
    freeMessages: WHATSAPP_AI_PLAN.freeMessages,
    packMessages: WHATSAPP_AI_PLAN.packMessages,
    priceLabel: formatRupees(WHATSAPP_AI_PLAN.packPricePaise, locale),
  };
  const enabledItems = dictionary.faq.items
    .filter((item) => !item.feature || isFeatureEnabled(item.feature))
    .map((item) => ({ id: item.id, question: item.question, answer: typeof item.answer === 'function' ? item.answer(plan) : item.answer }));
  const selectedItems = ids ? ids.map((id) => enabledItems.find((item) => item.id === id)).filter(Boolean) : enabledItems;
  return limit ? selectedItems.slice(0, limit) : selectedItems;
}
