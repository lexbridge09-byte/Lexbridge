'use client';

import { PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, AdminBackLink, AdminField, AdminPanel } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels } from '@/lib/localeTools';
import { paiseToRupeesInput, rupeesToPaise } from '@/lib/money';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function splitLines(value) {
  return String(value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function ProductForm({ product }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.productEditor;
  const labels = useCatalogLabels();
  const isNew = !product;
  const [faqItems, setFaqItems] = useState(product?.FaqItems ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);

  function updateFaqItem(itemIndex, field, value) {
    setFaqItems((items) => items.map((item, index) => (index === itemIndex ? { ...item, [field]: value } : item)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pricePaise = rupeesToPaise(formData.get('Price'));
    const compareAtPricePaise = rupeesToPaise(formData.get('CompareAt'));
    const validationErrors = {};
    if (pricePaise === null || Number.isNaN(pricePaise)) validationErrors.PricePaise = copy.invalidPrice;
    if (Number.isNaN(compareAtPricePaise)) validationErrors.CompareAtPricePaise = copy.invalidPrice;
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const payload = {
      Title: String(formData.get('Title') ?? '').trim(),
      Category: formData.get('Category'),
      ServiceCategory: formData.get('ServiceCategory'),
      PricePaise: pricePaise,
      CompareAtPricePaise: compareAtPricePaise,
      Summary: String(formData.get('Summary') ?? '').trim(),
      Inclusions: splitLines(formData.get('Inclusions')),
      DocumentsRequired: splitLines(formData.get('DocumentsRequired')),
      TurnaroundText: String(formData.get('TurnaroundText') ?? '').trim(),
      GovernmentFeeNote: String(formData.get('GovernmentFeeNote') ?? '').trim(),
      SortOrder: Number(formData.get('SortOrder') || 0),
      IsPublished: formData.get('IsPublished') === 'on',
      FaqItems: faqItems
        .map((item) => ({ Question: item.Question.trim(), Answer: item.Answer.trim() }))
        .filter((item) => item.Question && item.Answer),
    };
    const slug = String(formData.get('Slug') ?? '').trim();
    if (slug) payload.Slug = slug;

    setIsSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      if (isNew) {
        const data = await requestApi('/admin/products', { method: 'POST', body: payload });
        router.replace(toLocalized(`/admin/products/${data.product._id}`));
        return;
      }
      await requestApi(`/admin/products/${product._id}`, { method: 'PATCH', body: payload });
      setMessage({ tone: 'success', text: copy.saved });
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

  async function handleDelete() {
    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`/admin/products/${product._id}`, { method: 'DELETE' });
      router.replace(toLocalized('/admin/products'));
    } catch (error) {
      setMessage({ tone: 'error', text: error.status === 409 ? copy.deleteBlocked : localizeApiError(error, dictionary) });
      setIsSaving(false);
      setIsConfirmingDelete(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
        <AdminPanel>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField id="product-title" label={copy.title} error={fieldErrors.Title} className="sm:col-span-2">
              <input id="product-title" name="Title" required defaultValue={product?.Title ?? ''} className={`font-display text-base ${ADMIN_CONTROL_CLASS}`} />
            </AdminField>
            <AdminField id="product-slug" label={copy.slug} hint={copy.slugHint} error={fieldErrors.Slug}>
              <input id="product-slug" name="Slug" defaultValue={product?.Slug ?? ''} className={ADMIN_CONTROL_CLASS} />
            </AdminField>
            <AdminField id="product-turnaround" label={copy.turnaround}>
              <input
                id="product-turnaround"
                name="TurnaroundText"
                maxLength={120}
                placeholder={copy.turnaroundPlaceholder}
                defaultValue={product?.TurnaroundText ?? ''}
                className={ADMIN_CONTROL_CLASS}
              />
            </AdminField>
            <AdminField id="product-summary" label={copy.summary} error={fieldErrors.Summary} className="sm:col-span-2">
              <textarea id="product-summary" name="Summary" rows={2} maxLength={600} defaultValue={product?.Summary ?? ''} className={ADMIN_CONTROL_CLASS} />
            </AdminField>
            <AdminField id="product-inclusions" label={copy.inclusions} hint={copy.listHint} error={fieldErrors.Inclusions}>
              <textarea
                id="product-inclusions"
                name="Inclusions"
                rows={6}
                defaultValue={(product?.Inclusions ?? []).join('\n')}
                className={ADMIN_CONTROL_CLASS}
              />
            </AdminField>
            <AdminField id="product-documents" label={copy.documents} hint={copy.listHint} error={fieldErrors.DocumentsRequired}>
              <textarea
                id="product-documents"
                name="DocumentsRequired"
                rows={6}
                defaultValue={(product?.DocumentsRequired ?? []).join('\n')}
                className={ADMIN_CONTROL_CLASS}
              />
            </AdminField>
          </div>
        </AdminPanel>

        <AdminPanel>
          <div className="space-y-3">
            <AdminField id="product-category" label={copy.category} error={fieldErrors.Category}>
              <select id="product-category" name="Category" required defaultValue={product?.Category ?? PRODUCT_CATEGORY_KEYS[0]} className={ADMIN_CONTROL_CLASS}>
                {PRODUCT_CATEGORY_KEYS.map((categoryKey) => (
                  <option key={categoryKey} value={categoryKey}>
                    {labels.productCategory(categoryKey)}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField id="product-service" label={copy.serviceCategory} error={fieldErrors.ServiceCategory}>
              <select id="product-service" name="ServiceCategory" required defaultValue={product?.ServiceCategory ?? 'legal-drafting'} className={ADMIN_CONTROL_CLASS}>
                {labels.serviceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField id="product-price" label={copy.price} error={fieldErrors.PricePaise}>
                <input id="product-price" name="Price" inputMode="decimal" required defaultValue={paiseToRupeesInput(product?.PricePaise)} className={ADMIN_CONTROL_CLASS} />
              </AdminField>
              <AdminField id="product-compare" label={copy.compareAt} error={fieldErrors.CompareAtPricePaise}>
                <input id="product-compare" name="CompareAt" inputMode="decimal" defaultValue={paiseToRupeesInput(product?.CompareAtPricePaise)} className={ADMIN_CONTROL_CLASS} />
              </AdminField>
            </div>
            <p className="-mt-1 text-xs text-ink-muted">{copy.compareAtHint}</p>
            <AdminField id="product-fee" label={copy.governmentFee}>
              <input id="product-fee" name="GovernmentFeeNote" maxLength={300} defaultValue={product?.GovernmentFeeNote ?? ''} className={ADMIN_CONTROL_CLASS} />
            </AdminField>
            <AdminField id="product-sort" label={copy.sortOrder}>
              <input id="product-sort" name="SortOrder" type="number" defaultValue={product?.SortOrder ?? 0} className={ADMIN_CONTROL_CLASS} />
            </AdminField>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input type="checkbox" name="IsPublished" defaultChecked={product?.IsPublished ?? false} className="size-4 accent-primary" />
              {copy.isPublished}
            </label>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel
        as="fieldset"
        title={copy.faqTitle}
        action={
          <Button variant="outline" size="sm" onClick={() => setFaqItems((items) => [...items, { Question: '', Answer: '' }])}>
            {copy.addQuestion}
          </Button>
        }
      >
        <ol className="space-y-3">
          {faqItems.map((item, itemIndex) => (
            <li key={itemIndex} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-start">
              <AdminField id={`faq-question-${itemIndex}`} label={copy.question}>
                <input
                  id={`faq-question-${itemIndex}`}
                  value={item.Question}
                  maxLength={300}
                  onChange={(event) => updateFaqItem(itemIndex, 'Question', event.target.value)}
                  className={ADMIN_CONTROL_CLASS}
                />
              </AdminField>
              <AdminField id={`faq-answer-${itemIndex}`} label={copy.answer}>
                <textarea
                  id={`faq-answer-${itemIndex}`}
                  value={item.Answer}
                  rows={2}
                  maxLength={2000}
                  onChange={(event) => updateFaqItem(itemIndex, 'Answer', event.target.value)}
                  className={ADMIN_CONTROL_CLASS}
                />
              </AdminField>
              <button
                type="button"
                onClick={() => setFaqItems((items) => items.filter((_, index) => index !== itemIndex))}
                className="text-xs font-semibold text-danger hover:underline sm:mt-6"
              >
                {copy.removeQuestion}
              </button>
            </li>
          ))}
        </ol>
      </AdminPanel>

      <FormMessage message={message} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? dictionary.admin.common.saving : isNew ? copy.create : copy.save}
        </Button>
        {!isNew && product.IsPublished && (
          <LocaleLink href={`/services/${product.Slug}`} target="_blank" className="text-sm font-semibold text-primary hover:underline">
            {copy.viewOnSite}
          </LocaleLink>
        )}
        {!isNew && !isConfirmingDelete && (
          <button type="button" onClick={() => setIsConfirmingDelete(true)} className="ml-auto text-sm font-semibold text-danger hover:underline">
            {copy.delete}
          </button>
        )}
        {!isNew && isConfirmingDelete && (
          <span role="group" aria-label={copy.delete} className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <span>{copy.confirmBody}</span>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isSaving}>
              {copy.confirmYes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsConfirmingDelete(false)}>
              {copy.confirmNo}
            </Button>
          </span>
        )}
      </div>
    </form>
  );
}

export function ProductEditor({ productId }) {
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce;
  const { data, error, isLoading, reload } = useApiData(productId ? `/admin/products/${encodeURIComponent(productId)}` : null);

  const heading = (
    <div className="mb-4">
      <AdminBackLink href="/admin/products">{copy.productEditor.back}</AdminBackLink>
      <h1 className="mt-2 text-h3 text-ink">{productId ? copy.pageTitles.editProduct : copy.pageTitles.newProduct}</h1>
    </div>
  );

  if (!productId) {
    return (
      <div>
        {heading}
        <ProductForm />
      </div>
    );
  }
  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data?.product) return null;

  return (
    <div>
      {heading}
      <ProductForm key={data.product.updatedAt} product={data.product} />
    </div>
  );
}
