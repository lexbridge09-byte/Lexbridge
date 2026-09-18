'use client';

import { useDictionary } from '@/brand/localeContext';
import { CheckboxField } from '@/components/formFields';

export function WhatsAppOptInField({ checked, onChange }) {
  const optInText = useDictionary().whatsapp.optIn;
  const controlProps = onChange ? { checked, onChange: (event) => onChange(event.target.checked) } : {};
  return (
    <CheckboxField name="WhatsAppOptIn" {...controlProps}>
      {optInText}
    </CheckboxField>
  );
}
