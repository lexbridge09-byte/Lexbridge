'use client';

import { PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LINK_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminField,
  AdminPageHeading,
  AdminTable,
} from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Badge, ButtonLink } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

export function AdminProducts() {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.products;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [category, setCategory] = useState('');
  const [published, setPublished] = useState('');
  const [togglingId, setTogglingId] = useState('');
  const [message, setMessage] = useState(null);
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (published) params.set('published', published);
  const { data, error, isLoading, reload } = useApiData(`/admin/products${params.size ? `?${params}` : ''}`);
  const products = data?.products ?? [];

  async function togglePublished(product) {
    setTogglingId(product._id);
    setMessage(null);
    try {
      await requestApi(`/admin/products/${product._id}`, { method: 'PATCH', body: { IsPublished: !product.IsPublished } });
      reload();
    } catch (toggleError) {
      if (toggleError.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(toggleError, dictionary) });
    } finally {
      setTogglingId('');
    }
  }

  return (
    <div>
      <AdminPageHeading
        title={copy.title}
        description={copy.description}
        action={
          <ButtonLink href="/admin/products/new" size="sm">
            {copy.newProduct}
          </ButtonLink>
        }
      />

      <div className="mb-4 grid max-w-xl gap-3 sm:grid-cols-2">
        <AdminField id="product-category-filter" label={copy.category}>
          <select id="product-category-filter" value={category} onChange={(event) => setCategory(event.target.value)} className={ADMIN_CONTROL_CLASS}>
            <option value="">{copy.allCategories}</option>
            {PRODUCT_CATEGORY_KEYS.map((categoryKey) => (
              <option key={categoryKey} value={categoryKey}>
                {labels.productCategory(categoryKey)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField id="product-published-filter" label={copy.visibility}>
          <select id="product-published-filter" value={published} onChange={(event) => setPublished(event.target.value)} className={ADMIN_CONTROL_CLASS}>
            <option value="">{copy.all}</option>
            <option value="true">{copy.published}</option>
            <option value="false">{copy.hidden}</option>
          </select>
        </AdminField>
      </div>

      <FormMessage message={message} />

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : products.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.title}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.category}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.price}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.sort}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.visibility}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.updated}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {products.map((product) => (
              <tr key={product._id} className="hover:bg-surface-alt">
                <td className={ADMIN_TD_CLASS}>
                  <LocaleLink href={`/admin/products/${product._id}`} className={ADMIN_LINK_CLASS}>
                    {product.Title}
                  </LocaleLink>
                  <span className="block text-xs text-ink-muted">/services/{product.Slug}</span>
                </td>
                <td className={ADMIN_TD_CLASS}>{labels.productCategory(product.Category)}</td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>
                  {format.rupees(product.PricePaise)}
                  {product.CompareAtPricePaise > product.PricePaise && (
                    <s className="ml-1.5 text-xs text-ink-muted">{format.rupees(product.CompareAtPricePaise)}</s>
                  )}
                </td>
                <td className={ADMIN_TD_CLASS}>{product.SortOrder}</td>
                <td className={ADMIN_TD_CLASS}>
                  <div className="flex items-center gap-2">
                    <Badge tone={product.IsPublished ? 'done' : 'neutral'}>{product.IsPublished ? copy.published : copy.hidden}</Badge>
                    <button
                      type="button"
                      onClick={() => togglePublished(product)}
                      disabled={togglingId === product._id}
                      className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                    >
                      {togglingId === product._id ? dictionary.admin.common.saving : product.IsPublished ? copy.unpublish : copy.publish}
                    </button>
                  </div>
                </td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.date(product.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
