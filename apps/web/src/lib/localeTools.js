'use client';

import { useMemo } from 'react';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { createCatalogLabels } from '@/lib/catalogLabels';
import { createFormatters } from '@/lib/formatValues';

export function useCatalogLabels() {
  const dictionary = useDictionary();
  return useMemo(() => createCatalogLabels(dictionary), [dictionary]);
}

export function useFormatters() {
  const locale = useLocale();
  return useMemo(() => createFormatters(locale), [locale]);
}
