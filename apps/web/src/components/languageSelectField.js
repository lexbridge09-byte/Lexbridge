'use client';

import { useLocale } from '@/brand/localeContext';
import { SelectField } from '@/components/formFields';
import { useCatalogLabels } from '@/lib/localeTools';

// Preferred language for calls and updates; defaults to the language the site is being read in
export function LanguageSelectField({ id, label, name = 'PreferredLanguage', className }) {
  const locale = useLocale();
  const labels = useCatalogLabels();
  return <SelectField id={id} label={label} name={name} options={labels.languageOptions} defaultValue={locale} className={className} />;
}
