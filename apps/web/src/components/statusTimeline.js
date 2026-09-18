'use client';

import { useDictionary } from '@/brand/localeContext';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';

// Newest first. Notes are written by the LexBridge team and are visible to the client.
// `getLabel` lets other record types (orders) reuse the same timeline.
export function StatusTimeline({ entries, getLabel }) {
  const emptyText = useDictionary().forms.timeline.empty;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const labelFor = getLabel ?? labels.requestStatus;
  const orderedEntries = [...(entries ?? [])].sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  if (orderedEntries.length === 0) return <p className="text-ink-muted">{emptyText}</p>;

  return (
    <ol className="relative ml-3 border-l-2 border-line">
      {orderedEntries.map((entry, entryIndex) => {
        const isLatest = entryIndex === 0;
        return (
          <li key={`${entry.changedAt}-${entryIndex}`} className="relative pb-5 pl-6 last:pb-0">
            <span
              aria-hidden="true"
              className={`absolute -left-[9px] top-1 size-4 rounded-full ring-4 ring-white ${isLatest ? 'bg-primary' : 'bg-line-strong'}`}
            />
            <p className={`font-semibold ${isLatest ? 'text-ink' : 'text-ink-muted'}`}>{labelFor(entry.Status)}</p>
            <p className="text-xs text-ink-muted">{format.dateTime(entry.changedAt)}</p>
            {entry.Note && (
              <p className="mt-2 max-w-[65ch] whitespace-pre-line rounded-xl bg-surface-alt px-4 py-3 text-sm leading-6 text-ink">{entry.Note}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
