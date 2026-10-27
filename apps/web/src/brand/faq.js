import { WHATSAPP_AI_PLAN } from '@lexbridge/shared';
import { formatRupees } from '@/lib/formatValues';

// FAQ entries from the dictionary, minus answers for switched-off features.
// With `ids`, returns just those entries in that order; `limit` caps the count.
// Topic per question id, used to group and filter the FAQ page. Labels live in faq.center.topics.
const FAQ_TOPICS = {
  'law-firm': 'basics',
  category: 'basics',
  cost: 'basics',
  consultation: 'booking',
  whatsapp: 'booking',
  progress: 'booking',
  privacy: 'privacy',
};

export function getFaqItems(dictionary, locale, features = {}, { ids, limit } = {}) {
  const plan = {
    freeMessages: WHATSAPP_AI_PLAN.freeMessages,
    packMessages: WHATSAPP_AI_PLAN.packMessages,
    priceLabel: formatRupees(WHATSAPP_AI_PLAN.packPricePaise, locale),
  };
  const enabledItems = dictionary.faq.items
    .filter((item) => !item.feature || features[item.feature])
    .map((item) => ({ id: item.id, topic: FAQ_TOPICS[item.id] ?? 'basics', question: item.question, answer: typeof item.answer === 'function' ? item.answer(plan) : item.answer }));
  const selectedItems = ids ? ids.map((id) => enabledItems.find((item) => item.id === id)).filter(Boolean) : enabledItems;
  return limit ? selectedItems.slice(0, limit) : selectedItems;
}
