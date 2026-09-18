'use client';

import { HI_DICTIONARY } from './copy/hi/index.js';
import { LocaleProviderBase, setActiveDictionary } from './localeContext.js';

// Hindi pages import only the Hindi dictionary into the browser bundle
export function LocaleProviderHi({ children }) {
  setActiveDictionary(HI_DICTIONARY);
  return (
    <LocaleProviderBase locale="hi" dictionary={HI_DICTIONARY}>
      {children}
    </LocaleProviderBase>
  );
}
