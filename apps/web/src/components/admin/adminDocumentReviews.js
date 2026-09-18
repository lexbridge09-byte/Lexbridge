'use client';

import { DOCUMENT_REVIEW_STATUSES } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminField,
  AdminPageHeading,
  AdminTable,
} from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Pagination } from '@/components/pagination';
import { DocumentReviewStatusBadge, RiskBadge } from '@/components/statusBadge';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;

export function AdminDocumentReviews() {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.documentReviews;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/document-reviews?${buildAdminQuery({ status }, page, PAGE_LIMIT)}`);
  const items = data?.items ?? [];

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <AdminField id="review-status-filter" label={common.status} className="mb-4 max-w-xs">
        <select
          id="review-status-filter"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className={ADMIN_CONTROL_CLASS}
        >
          <option value="">{common.allStatuses}</option>
          {DOCUMENT_REVIEW_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {labels.documentReviewStatus(statusOption)}
            </option>
          ))}
        </select>
      </AdminField>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.reference}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.owner}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.file}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.risk}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.created}</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((review) => (
                <tr key={review.ReferenceCode} className="hover:bg-surface-alt">
                  <td className={ADMIN_TD_CLASS}>
                    <LocaleLink href={`/admin/document-reviews/${review.ReferenceCode}`} className={ADMIN_LINK_CLASS}>
                      {review.ReferenceCode}
                    </LocaleLink>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <span className="block">{review.Owner?.FullName || review.Owner?.Email || '—'}</span>
                    {review.Owner?.FullName && <span className="block text-xs text-ink-muted">{review.Owner.Email}</span>}
                  </td>
                  <td className={`${ADMIN_TD_CLASS} max-w-56 break-all`}>
                    {review.OriginalName}
                    <span className="block text-xs text-ink-muted">{format.fileSize(review.SizeBytes)}</span>
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <DocumentReviewStatusBadge status={review.Status} />
                  </td>
                  <td className={ADMIN_TD_CLASS}>
                    <RiskBadge level={review.RiskLevel} />
                  </td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.dateTime(review.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
