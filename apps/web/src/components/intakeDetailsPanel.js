'use client';

import { Fragment } from 'react';

import { getDisplayableIntakeDetails } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';

/*
  Subtype-specific answers a client gave at intake ("Matter details"): shown to the
  owner/2nd owner on request, consultation and document-review detail pages so assignment
  is informed. Renders nothing when the record predates intake details.
*/
export function IntakeDetailsPanel({ subtype, details }) {
  const dictionary = useDictionary();
  const intake = dictionary.intake;
  const entries = getDisplayableIntakeDetails(subtype, details);
  if (entries.length === 0) return null;

  return (
    <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
      {entries.map(({ key, type, value }) => (
        <Fragment key={key}>
          <dt className="text-xs font-semibold text-ink-muted sm:pt-0.5">{intake.fields[key]?.label ?? key}</dt>
          <dd className="min-w-0 break-words text-sm text-ink">{type === 'select' ? (intake.options[value] ?? value) : value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
