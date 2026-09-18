'use client';

import Link from 'next/link';
import { localizedHref } from '@/brand/locales';
import { useLocale } from '@/brand/localeContext';

// Drop-in for next/link: internal paths like "/services" automatically get the current locale prefix
export function LocaleLink({ href, ...linkProps }) {
  const locale = useLocale();
  return <Link href={typeof href === 'string' ? localizedHref(locale, href) : href} {...linkProps} />;
}
