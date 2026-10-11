'use client';

import { ChevronLeft } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { RequestStatusBadge } from '@/components/statusBadge';
import { Card } from '@/components/ui';
import { useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function TeamConsultationDetail({ referenceCode }) {
  const dictionary = useDictionary();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/team/consultations/${encodeURIComponent(referenceCode)}`);

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const consultation = data?.consultation;
  if (!consultation) return null;
  const client = consultation.Client;

  return (
    <div className="space-y-5">
      <LocaleLink href="/team" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ChevronLeft aria-hidden="true" className="size-4" />
        {dictionary.team.detail.breadcrumb}
      </LocaleLink>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h3 text-on-canvas">{consultation.IntakeSubtype || consultation.ConsultationType}</h1>
        <RequestStatusBadge status={consultation.Status} />
      </div>
      <p className="text-sm text-on-canvas-muted">{consultation.ReferenceCode} · {format.dateTime(consultation.StartsAt)}</p>
      {!consultation.MeetingLink && consultation.Status === 'scheduled' && (
        <Card padding="md"><p className="font-semibold text-ink">Meeting link is not available yet.</p><p className="mt-1 text-sm text-ink-muted">Ask the manager to add the link before the consultation starts.</p></Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h2 className="text-h4 text-ink">Client</h2>
          <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-ink-muted">Name</dt><dd className="text-ink">{client?.FullName || '—'}</dd></div><div><dt className="text-ink-muted">Email</dt><dd className="text-ink">{client?.Email || '—'}</dd></div><div><dt className="text-ink-muted">Phone</dt><dd className="text-ink">{client?.Phone || '—'}</dd></div></dl>
        </Card>
        <Card padding="md">
          <h2 className="text-h4 text-ink">Consultation</h2>
          <dl className="mt-3 space-y-2 text-sm"><div><dt className="text-ink-muted">Mode</dt><dd className="text-ink">{consultation.Mode}</dd></div><div><dt className="text-ink-muted">Duration</dt><dd className="text-ink">{consultation.DurationMinutes} minutes</dd></div><div><dt className="text-ink-muted">Meeting link</dt><dd className="break-all text-ink">{consultation.MeetingLink || 'Not added'}</dd></div></dl>
        </Card>
      </div>
      <Card padding="md"><h2 className="text-h4 text-ink">Client request</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink">{consultation.Description}</p></Card>
    </div>
  );
}
