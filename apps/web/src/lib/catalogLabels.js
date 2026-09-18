import { SERVICE_CATALOG, SUPPORTED_LANGUAGES } from '@lexbridge/shared';

function readLabel(entry, fallbackKey) {
  if (typeof entry === 'string') return entry;
  return entry?.label ?? fallbackKey ?? '';
}

// Localised labels for shared catalog values. Unknown keys fall back to the raw key so nothing renders blank.
export function createCatalogLabels(dictionary) {
  const catalog = dictionary.catalog;
  const commerceLabels = dictionary.commerce.labels;
  const reviewLabels = dictionary.documentReview.labels;

  function language(key) {
    return commerceLabels.languages[key] ?? key;
  }

  return {
    service: (key) => readLabel(catalog.services[key], key),
    serviceSummary: (key) => catalog.services[key]?.summary ?? '',
    serviceOptions: SERVICE_CATALOG.map((service) => ({ value: service.key, label: readLabel(catalog.services[service.key], service.key) })),
    requestStatus: (key) => readLabel(catalog.requestStatuses[key], key),
    consultationType: (key) => readLabel(catalog.consultationTypes[key], key),
    consultationTypeSummary: (key) => catalog.consultationTypes[key]?.summary ?? '',
    consultationMode: (key) => readLabel(catalog.consultationModes[key], key),
    consultationModeSummary: (key) => catalog.consultationModes[key]?.summary ?? '',
    consultationStatus: (key) => readLabel(catalog.consultationStatuses[key], key),
    slotStatus: (key) => readLabel(catalog.slotStatuses[key], key),
    articleTopic: (key) => readLabel(catalog.articleTopics[key], key),
    articleTopicSummary: (key) => catalog.articleTopics[key]?.summary ?? '',
    articleStatus: (key) => readLabel(catalog.articleStatuses[key], key),
    role: (key) => readLabel(catalog.roles[key], key),
    requestSource: (key) => readLabel(catalog.requestSources[key], key),
    whatsAppMessageKind: (key) => readLabel(catalog.whatsAppMessageKinds[key], key),
    whatsAppCharge: (key) => (catalog.whatsAppCharges[key] ? readLabel(catalog.whatsAppCharges[key], key) : ''),
    whatsAppPaymentStatus: (key) => readLabel(catalog.whatsAppPaymentStatuses[key], key),
    productCategory: (key) => readLabel(commerceLabels.productCategories[key], key),
    productCategorySummary: (key) => commerceLabels.productCategories[key]?.summary ?? '',
    orderStatus: (key) => readLabel(commerceLabels.orderStatuses[key], key),
    couponType: (key) => readLabel(commerceLabels.couponTypes[key], key),
    refundStatus: (key) => readLabel(commerceLabels.refundStatuses[key], key),
    callbackStatus: (key) => readLabel(dictionary.adminCommerce.callbackStatuses[key], key),
    callbackTimeWindow: (key) => readLabel(dictionary.callback.timeWindows[key], key),
    documentReviewStatus: (key) => readLabel(reviewLabels.statuses[key], key),
    riskLevel: (key) => readLabel(reviewLabels.riskLevels[key], key),
    language,
    // "Tamil (தமிழ்)"; the native name is left out when it matches the reader's language name
    languageOptions: SUPPORTED_LANGUAGES.map((option) => {
      const localLabel = language(option.key);
      return { value: option.key, label: localLabel === option.nativeLabel ? localLabel : `${localLabel} (${option.nativeLabel})` };
    }),
  };
}
