'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminBackLink,
  AdminPageHeading,
  AdminPanel,
  AdminTable,
} from '@/components/admin/adminStyles';
import { FieldError } from '@/components/formFields';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { formatWhatsAppNumber } from '@/lib/formatValues';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const MESSAGE_PAGE_LIMIT = 50;

function GrantQuestionsForm({ contactId, onGranted }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.whatsappContact.grant;
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSaving(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const { contact } = await requestApi(`/admin/whatsapp/contacts/${contactId}/credits`, {
        method: 'POST',
        body: { Messages: Number(formData.get('Messages')), Reason: String(formData.get('Reason') ?? '') },
      });
      form.reset();
      setMessage({ tone: 'success', text: copy.added(contact.PaidMessagesRemaining) });
      onGranted();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPanel as="form" title={copy.title} onSubmit={handleSubmit} noValidate>
      <p className="-mt-1 mb-3 text-xs text-ink-muted">{copy.body}</p>
      <div className="space-y-3">
        <div>
          <label htmlFor="grant-messages" className={ADMIN_LABEL_CLASS}>
            {copy.count}
          </label>
          <input
            id="grant-messages"
            name="Messages"
            type="number"
            min={1}
            max={500}
            required
            aria-invalid={Boolean(fieldErrors.Messages)}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
          <FieldError id="grant-messages-error" message={fieldErrors.Messages} />
        </div>
        <div>
          <label htmlFor="grant-reason" className={ADMIN_LABEL_CLASS}>
            {copy.reason}
          </label>
          <input
            id="grant-reason"
            name="Reason"
            type="text"
            maxLength={200}
            required
            aria-invalid={Boolean(fieldErrors.Reason)}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
          <FieldError id="grant-reason-error" message={fieldErrors.Reason} />
        </div>
        <FormMessage message={message} />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? copy.adding : copy.submit}
        </Button>
      </div>
    </AdminPanel>
  );
}

function ConversationThread({ messages, page, onPageChange }) {
  const copy = useDictionary().admin.whatsappContact;
  const labels = useCatalogLabels();
  const format = useFormatters();
  if (messages.items.length === 0) return <p className="text-sm text-ink-muted">{copy.noMessages}</p>;

  return (
    <>
      <ol className="space-y-2">
        {messages.items.map((message) => {
          const isInbound = message.Direction === 'in';
          const chargeLabel = labels.whatsAppCharge(message.ChargeType);
          return (
            <li
              key={message._id}
              className={`max-w-[46rem] rounded-xl border px-3.5 py-2.5 ${isInbound ? 'mr-auto border-line bg-surface-alt' : 'ml-auto border-primary-100 bg-primary-50'}`}
            >
              <p className="text-xs text-ink-muted">
                {[isInbound ? copy.fromContact : copy.toContact, labels.whatsAppMessageKind(message.Kind), chargeLabel, format.dateTime(message.createdAt)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">
                {message.Body || (message.MessageType !== 'text' ? copy.mediaMessage(message.MessageType) : '')}
              </p>
            </li>
          );
        })}
      </ol>
      <Pagination page={page} limit={messages.limit ?? MESSAGE_PAGE_LIMIT} total={messages.total} onPageChange={onPageChange} />
    </>
  );
}

function DetailItem({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

export function AdminWhatsAppContact({ contactId }) {
  const adminCopy = useDictionary().admin;
  const copy = adminCopy.whatsappContact;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [messagePage, setMessagePage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(
    `/admin/whatsapp/contacts/${encodeURIComponent(contactId)}?page=${messagePage}&limit=${MESSAGE_PAGE_LIMIT}`,
  );

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data) return null;

  const { contact, messages, payments } = data;
  const creditGrants = [...(contact.CreditGrants ?? [])].reverse();

  return (
    <div>
      <AdminBackLink href="/admin/whatsapp">{copy.back}</AdminBackLink>
      <div className="mt-2">
        <AdminPageHeading
          title={contact.ProfileName || formatWhatsAppNumber(contact.Phone)}
          description={contact.ProfileName ? formatWhatsAppNumber(contact.Phone) : undefined}
        />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <AdminPanel>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <DetailItem label={copy.freeLeft}>{contact.FreeMessagesRemaining}</DetailItem>
              <DetailItem label={copy.paidLeft}>{contact.PaidMessagesRemaining}</DetailItem>
              <DetailItem label={copy.status}>
                {contact.IsOptedOut ? copy.optedOutOn(contact.optedOutAt ? format.dateTime(contact.optedOutAt) : '') : copy.active}
              </DetailItem>
              <DetailItem label={copy.noticeSent}>{contact.ConsentNoticeSentAt ? format.dateTime(contact.ConsentNoticeSentAt) : copy.notYet}</DetailItem>
              <DetailItem label={copy.closestService}>{contact.LastSuggestedCategory ? labels.service(contact.LastSuggestedCategory) : '—'}</DetailItem>
              <DetailItem label={copy.latestHandoff}>
                {contact.LastHandoffReference ? (
                  <LocaleLink href={`/admin/requests/${encodeURIComponent(contact.LastHandoffReference)}`} className={ADMIN_LINK_CLASS}>
                    {contact.LastHandoffReference}
                  </LocaleLink>
                ) : (
                  adminCopy.common.none
                )}
              </DetailItem>
            </dl>
          </AdminPanel>

          <AdminPanel as="section" title={copy.conversation}>
            <ConversationThread messages={messages} page={messagePage} onPageChange={setMessagePage} />
          </AdminPanel>

          <AdminPanel as="section" title={copy.payments}>
            {payments.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.noPayments}</p>
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.amount}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.questions}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.status}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.sent}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.paid}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.paymentColumns.razorpay}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td className={ADMIN_TD_CLASS}>{format.rupees(payment.AmountPaise)}</td>
                      <td className={ADMIN_TD_CLASS}>{payment.MessagesGranted}</td>
                      <td className={ADMIN_TD_CLASS}>{labels.whatsAppPaymentStatus(payment.Status)}</td>
                      <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.dateTime(payment.createdAt)}</td>
                      <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{payment.paidAt ? format.dateTime(payment.paidAt) : ''}</td>
                      <td className={`${ADMIN_TD_CLASS} break-all`}>{payment.RazorpayPaymentId || payment.RazorpayPaymentLinkId}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminPanel>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <GrantQuestionsForm contactId={contactId} onGranted={reload} />
          <AdminPanel as="section" title={copy.grantsTitle}>
            {creditGrants.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.grantsEmpty}</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {creditGrants.map((grant) => (
                  <li key={`${grant.grantedAt}-${grant.Messages}`} className="py-2">
                    <p className="text-ink">{copy.grantSummary(grant.Messages, grant.Reason)}</p>
                    <p className="text-xs text-ink-muted">
                      {copy.grantMeta(grant.GrantedBy?.FullName || grant.GrantedBy?.Email || copy.grantedByFallback, format.dateTime(grant.grantedAt))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </aside>
      </div>
    </div>
  );
}
