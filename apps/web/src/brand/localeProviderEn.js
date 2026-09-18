'use client';

import { EN_DICTIONARY } from './copy/en/index.js';
import { LocaleProviderBase, setActiveDictionary } from './localeContext.js';

// English pages import only the English dictionary into the browser bundle
export function LocaleProviderEn({ children }) {
  setActiveDictionary(EN_DICTIONARY);
  return (
    <LocaleProviderBase locale="en" dictionary={EN_DICTIONARY}>
      {children}
    </LocaleProviderBase>
  );
}
