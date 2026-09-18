'use client';

import { REQUEST_STATUSES } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { AdminPageHeading, AdminPanel } from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function AdminOverview() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.overview;
  const commerceCopy = dictionary.adminCommerce.overview;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/admin/overview');

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const counts = data?.counts ?? {};
  // A count the API reports as null belongs to a switched-off feature, so its card is left out
  const summaryItems = [
    { key: 'openRequests', label: copy.openRequests, value: counts.openRequests, href: '/admin/requests' },
    { key: 'ordersPaidToday', label: commerceCopy.ordersPaidToday, value: counts.ordersPaidToday, href: '/admin/orders?status=paid' },
    {
      key: 'revenuePaidTodayPaise',
      label: commerceCopy.revenuePaidToday,
      value: counts.revenuePaidTodayPaise,
      display: format.rupees(counts.revenuePaidTodayPaise),
      href: '/admin/orders?status=paid',
    },
    { key: 'openCallbacks', label: commerceCopy.openCallbacks, value: counts.openCallbacks, href: '/admin/callbacks' },
    { key: 'upcomingConsultations', label: copy.upcomingConsultations, value: counts.upcomingConsultations, href: '/admin/consultations' },
    { key: 'documentReviewsToday', label: commerceCopy.documentReviewsToday, value: counts.documentReviewsToday, href: '/admin/document-reviews' },
    { key: 'openSlots', label: copy.openSlots, value: counts.openSlots, href: '/admin/slots' },
    { key: 'publishedArticles', label: copy.publishedArticles, value: counts.publishedArticles, href: '/admin/articles' },
  ].filter((item) => item.value !== null && item.value !== undefined);

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryItems.map((item) => (
          <div key={item.key} className="relative rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-primary-100">
            <dt className="text-xs font-semibold text-ink-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-ink">
              <LocaleLink href={item.href} className="after:absolute after:inset-0 after:content-['']">
                {item.display ?? format.number(item.value)}
              </LocaleLink>
            </dd>
          </div>
        ))}
      </dl>

      <AdminPanel as="section" title={copy.requestsByStatus} className="mt-5 max-w-xl">
        <ul className="divide-y divide-line">
          {REQUEST_STATUSES.map((status) => (
            <li key={status}>
              <LocaleLink href={`/admin/requests?status=${status}`} className="flex items-center justify-between py-2 text-sm hover:text-primary">
                <span>{labels.requestStatus(status)}</span>
                <span className="font-semibold">{format.number(counts.requestsByStatus?.[status] ?? 0)}</span>
              </LocaleLink>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
