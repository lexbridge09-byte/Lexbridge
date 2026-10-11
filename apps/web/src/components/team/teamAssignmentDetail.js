'use client';

import { ChevronLeft } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const DATA_KEYS = { callback: 'callback', 'document-review': 'review', order: 'order', 'follow-up': 'followUp' };

export function TeamAssignmentDetail({ kind, referenceCode }) {
  const dictionary = useDictionary();
  const format = useFormatters();
  const endpointKind = kind === 'document-review' ? 'document-reviews' : `${kind}s`;
  const { data, error, isLoading, reload } = useApiData(`/team/${endpointKind}/${encodeURIComponent(referenceCode)}`);
  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const item = data?.[DATA_KEYS[kind]];
  if (!item) return null;
  const title = item.Title || item.Topic || item.OriginalName || item.Items?.[0]?.TitleSnapshot || kind;
  const clientName = item.FullName || item.Owner?.FullName || '';
  return (
    <div className="space-y-5">
      <LocaleLink href="/team" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ChevronLeft className="size-4" />{dictionary.team.detail.breadcrumb}</LocaleLink>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-h3 text-on-canvas">{title}</h1><RequestStatusBadge status={item.Status} /></div>
      <p className="text-sm text-on-canvas-muted">{item.ReferenceCode} · {format.dateTime(item.DueAt || item.createdAt)}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md"><h2 className="text-h4 text-ink">Client</h2><p className="mt-3 text-sm text-ink">{clientName || '—'}</p><p className="text-sm text-ink-muted">{item.Email || item.Owner?.Email || item.Phone || '—'}</p></Card>
        <Card padding="md"><h2 className="text-h4 text-ink">Work details</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="text-ink-muted">Type</dt><dd className="text-ink">{kind}</dd></div><div><dt className="text-ink-muted">Next action / notes</dt><dd className="whitespace-pre-line text-ink">{item.NextAction || item.Notes || item.Description || item.RiskLevel || '—'}</dd></div></dl></Card>
      </div>
    </div>
  );
}
