'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminPageHeading,
  AdminPanel,
  AdminTable,
} from '@/components/admin/adminStyles';
import { WhatsAppSetupNotice } from '@/components/admin/whatsAppSetupNotice';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui';
import { formatWhatsAppNumber } from '@/lib/formatValues';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;
const RECENT_PAYMENTS_LIMIT = 10;

function RecentPayments() {
  const copy = useDictionary().admin.whatsappContacts.payments;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(`/admin/whatsapp/payments?limit=${RECENT_PAYMENTS_LIMIT}`);
  const items = data?.items ?? [];

  return (
    <AdminPanel as="section" title={copy.title} className="mt-5">
      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.contact}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.amount}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.questions}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.created}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.paid}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((payment) => (
              <tr key={payment._id}>
                <td className={ADMIN_TD_CLASS}>
                  {payment.Contact ? (
                    <LocaleLink href={`/admin/whatsapp/${payment.Contact._id}`} className={ADMIN_LINK_CLASS}>
                      {payment.Contact.ProfileName || formatWhatsAppNumber(payment.Contact.Phone)}
                    </LocaleLink>
                  ) : (
                    copy.deletedContact
                  )}
                </td>
                <td className={ADMIN_TD_CLASS}>{format.rupees(payment.AmountPaise)}</td>
                <td className={ADMIN_TD_CLASS}>{payment.MessagesGranted}</td>
                <td className={ADMIN_TD_CLASS}>{labels.whatsAppPaymentStatus(payment.Status)}</td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.dateTime(payment.createdAt)}</td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{payment.paidAt ? format.dateTime(payment.paidAt) : ''}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPanel>
  );
}

export function AdminWhatsAppContacts() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.whatsappContacts;
  const format = useFormatters();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
  if (query) params.set('q', query);

  const { data: status } = useApiData('/admin/whatsapp/status');
  const { data, error, isLoading, reload } = useApiData(`/admin/whatsapp/contacts?${params}`);
  const items = data?.items ?? [];
  const plan = status?.plan;

  function handleSearchSubmit(event) {
    event.preventDefault();
    setQuery(String(new FormData(event.currentTarget).get('q') ?? '').trim());
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeading
        title={copy.title}
        description={plan ? copy.planDescription(plan.freeMessages, format.rupees(plan.packPricePaise), plan.packMessages) : copy.description}
      />

      <WhatsAppSetupNotice status={status} />

      <form onSubmit={handleSearchSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="whatsapp-q" className={ADMIN_LABEL_CLASS}>
            {dictionary.admin.common.search}
          </label>
          <input
            id="whatsapp-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={copy.searchPlaceholder}
            title={copy.searchHint}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
        </div>
        <Button type="submit" size="sm">
          {dictionary.admin.common.search}
        </Button>
      </form>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{query ? copy.emptySearch : copy.empty}</p>
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.number}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.name}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.freeLeft}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.paidLeft}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.lastMessage}</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((contact) => (
                <tr key={contact._id} className="hover:bg-surface-alt">
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>
                    <LocaleLink href={`/admin/whatsapp/${contact._id}`} className={ADMIN_LINK_CLASS}>
                      {formatWhatsAppNumber(contact.Phone)}
                    </LocaleLink>
                  </td>
                  <td className={ADMIN_TD_CLASS}>{contact.ProfileName || copy.notShared}</td>
                  <td className={ADMIN_TD_CLASS}>{contact.FreeMessagesRemaining}</td>
                  <td className={ADMIN_TD_CLASS}>{contact.PaidMessagesRemaining}</td>
                  <td className={ADMIN_TD_CLASS}>{contact.IsOptedOut ? copy.optedOut : copy.active}</td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{contact.LastInboundAt ? format.dateTime(contact.LastInboundAt) : ''}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}

      <RecentPayments />
    </div>
  );
}
