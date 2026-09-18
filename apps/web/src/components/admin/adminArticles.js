'use client';

import { useState } from 'react';
import { ARTICLE_STATUSES } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminPageHeading,
  AdminTable,
} from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { ArticleStatusBadge } from '@/components/statusBadge';
import { ButtonLink } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

export function AdminArticles() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.articles;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [status, setStatus] = useState('');
  const { data, error, isLoading, reload } = useApiData(`/admin/articles${status ? `?status=${status}` : ''}`);
  const articles = data?.articles ?? [];
  const filterLabels = { published: copy.publishedFilter, draft: copy.draftsFilter };

  return (
    <div>
      <AdminPageHeading
        title={copy.title}
        description={copy.description}
        action={
          <ButtonLink href="/admin/articles/new" size="sm">
            {copy.newArticle}
          </ButtonLink>
        }
      />

      <div className="mb-4 max-w-xs">
        <label htmlFor="article-status-filter" className={ADMIN_LABEL_CLASS}>
          {dictionary.admin.common.status}
        </label>
        <select
          id="article-status-filter"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
        >
          <option value="">{copy.allArticles}</option>
          {ARTICLE_STATUSES.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {filterLabels[statusOption] ?? labels.articleStatus(statusOption)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : articles.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.title}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.topic}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.status}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.updated}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {articles.map((article) => (
              <tr key={article._id} className="hover:bg-surface-alt">
                <td className={ADMIN_TD_CLASS}>
                  <LocaleLink href={`/admin/articles/${article._id}`} className={ADMIN_LINK_CLASS}>
                    {article.Title}
                  </LocaleLink>
                  <span className="block text-xs text-ink-muted">/insights/{article.Slug}</span>
                </td>
                <td className={ADMIN_TD_CLASS}>{labels.articleTopic(article.Topic)}</td>
                <td className={ADMIN_TD_CLASS}>
                  <ArticleStatusBadge status={article.Status} />
                </td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.date(article.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
