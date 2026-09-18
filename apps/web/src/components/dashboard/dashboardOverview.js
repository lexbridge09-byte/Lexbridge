'use client';

import { CalendarDays, FileText, LifeBuoy } from 'lucide-react';
import { useState } from 'react';
import { isFeatureEnabled } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { ConsultationStatusBadge, RequestStatusBadge } from '@/components/statusBadge';
import { ButtonLink, Card } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const CLOSED_REQUEST_STATUSES = ['completed', 'closed'];
const LINK_CLASS = 'text-sm font-semibold text-primary underline-offset-4 hover:underline';

function SummaryCard({ icon: Icon, title, children, action }) {
  return (
    <Card padding="sm" className="flex items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
        <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="text-sm leading-6 text-ink-muted">{children}</p>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </Card>
  );
}

export function DashboardOverview() {
  const copy = useDictionary().dashboard.overview;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const isBookingEnabled = isFeatureEnabled('consultationBooking');
  const isDocumentsEnabled = isFeatureEnabled('documentUploads');
  const [nowMs] = useState(() => Date.now());
  const me = useApiData('/auth/me');
  const requests = useApiData('/service-requests/mine');
  const consultations = useApiData(isBookingEnabled ? '/consultations/mine' : null);
  const documents = useApiData(isDocumentsEnabled ? '/documents/mine' : null);

  const firstName = me.data?.user?.FullName?.split(' ')[0];
  const activeRequests = (requests.data?.requests ?? []).filter((request) => !CLOSED_REQUEST_STATUSES.includes(request.Status));
  const upcomingConsultation = (consultations.data?.consultations ?? [])
    .filter((consultation) => consultation.Status === 'scheduled' && new Date(consultation.StartsAt).getTime() > nowMs)
    .sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt))[0];
  const documentCount = documents.data?.documents?.length ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.welcome(firstName)}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      <Card as="section" padding="md" aria-labelledby="active-requests">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="active-requests" className="text-h4 text-ink">
            {copy.activeRequests}
          </h2>
          <LocaleLink href="/dashboard/requests" className={LINK_CLASS}>
            {copy.allRequests}
          </LocaleLink>
        </div>
        <div className="mt-3">
          {requests.isLoading && !requests.data ? (
            <LoadingNote rows={2} />
          ) : requests.error ? (
            <ErrorNote error={requests.error} onRetry={requests.reload} />
          ) : activeRequests.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {copy.noActiveBefore}{' '}
              {isFeatureEnabled('solutionFinder') && (
                <>
                  <LocaleLink href="/find-my-solution" className={LINK_CLASS}>
                    {copy.noActiveFinder}
                  </LocaleLink>{' '}
                  {copy.noActiveOr}{' '}
                </>
              )}
              <LocaleLink href="/contact" className={LINK_CLASS}>
                {copy.noActiveContact}
              </LocaleLink>
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {activeRequests.map((request) => (
                <li key={request.ReferenceCode} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{request.Subtype || labels.service(request.ServiceCategory)}</p>
                    <p className="text-xs text-ink-muted">{copy.requestMeta(request.ReferenceCode, format.date(request.createdAt))}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <RequestStatusBadge status={request.Status} />
                    <LocaleLink href={`/dashboard/requests/${request.ReferenceCode}`} className={LINK_CLASS}>
                      {copy.viewRequest}
                    </LocaleLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {isBookingEnabled && (
        <Card as="section" padding="md" aria-labelledby="upcoming-consultation">
          <h2 id="upcoming-consultation" className="flex items-center gap-2 text-h4 text-ink">
            <CalendarDays aria-hidden="true" className="size-5 text-primary" strokeWidth={1.75} />
            {copy.upcomingConsultation}
          </h2>
          <div className="mt-3">
            {consultations.isLoading && !consultations.data ? (
              <LoadingNote rows={1} />
            ) : consultations.error ? (
              <ErrorNote error={consultations.error} onRetry={consultations.reload} />
            ) : !upcomingConsultation ? (
              <p className="text-sm text-ink-muted">
                {copy.noUpcoming}{' '}
                <LocaleLink href="/consultation" className={LINK_CLASS}>
                  {copy.book}
                </LocaleLink>
              </p>
            ) : (
              <div className="rounded-xl bg-surface-alt p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{labels.consultationType(upcomingConsultation.ConsultationType)}</p>
                  <ConsultationStatusBadge status={upcomingConsultation.Status} />
                </div>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold text-ink-muted">{copy.dateLabel}</dt>
                    <dd className="text-ink">{format.day(upcomingConsultation.StartsAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-ink-muted">{copy.timeLabel}</dt>
                    <dd className="text-ink">{copy.timeValue(format.time(upcomingConsultation.StartsAt))}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-ink-muted">{copy.modeLabel}</dt>
                    <dd className="text-ink">{labels.consultationMode(upcomingConsultation.Mode)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                  {upcomingConsultation.Mode === 'video' &&
                    (upcomingConsultation.MeetingLink ? (
                      <ButtonLink href={upcomingConsultation.MeetingLink} isExternal size="sm">
                        {copy.joinVideo}
                      </ButtonLink>
                    ) : (
                      <p className="text-sm text-ink-muted">{copy.videoPending}</p>
                    ))}
                  <LocaleLink href="/dashboard/consultations" className={LINK_CLASS}>
                    {copy.viewDetails}
                  </LocaleLink>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {isDocumentsEnabled && (
          <SummaryCard
            icon={FileText}
            title={copy.documentsTitle}
            action={
              <LocaleLink href="/dashboard/documents" className={LINK_CLASS}>
                {copy.documentCentre}
              </LocaleLink>
            }
          >
            {documents.error ? copy.documentsUnavailable : documents.data ? copy.documentsCount(documentCount) : copy.documentsDefault}
          </SummaryCard>
        )}
        <SummaryCard
          icon={LifeBuoy}
          title={copy.supportTitle}
          action={
            <LocaleLink href="/contact" className={LINK_CLASS}>
              {copy.supportCta}
            </LocaleLink>
          }
        >
          {copy.supportBody}
        </SummaryCard>
      </div>
    </div>
  );
}
