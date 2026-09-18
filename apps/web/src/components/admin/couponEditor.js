'use client';

import { COUPON_TYPES, PRODUCT_CATEGORY_KEYS } from '@lexbridge/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, AdminBackLink, AdminField, AdminPanel } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels } from '@/lib/localeTools';
import { paiseToRupeesInput, rupeesToPaise } from '@/lib/money';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

// <input type="datetime-local"> works in the admin's own time zone
function toDateTimeInput(isoValue) {
  if (!isoValue) return '';
  const date = new Date(isoValue);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromDateTimeInput(value) {
  return value ? new Date(value).toISOString() : null;
}

function readWholeNumber(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return 0;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

function CouponForm({ coupon }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const copy = dictionary.adminCommerce.couponEditor;
  const labels = useCatalogLabels();
  const isNew = !coupon;
  const [type, setType] = useState(coupon?.Type ?? 'percent');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = type === 'flat' ? rupeesToPaise(formData.get('Value')) : readWholeNumber(formData.get('Value'));
    const maxDiscountPaise = rupeesToPaise(formData.get('MaxDiscount')) ?? 0;
    const minOrderPaise = rupeesToPaise(formData.get('MinOrder')) ?? 0;
    const maxRedemptions = readWholeNumber(formData.get('MaxRedemptions'));
    const perUserLimit = readWholeNumber(formData.get('PerUserLimit'));

    const validationErrors = {};
    if (!Number.isFinite(value) || value < 1 || (type === 'percent' && value > 100)) validationErrors.Value = copy.invalidValue;
    if (Number.isNaN(maxDiscountPaise)) validationErrors.MaxDiscountPaise = copy.invalidValue;
    if (Number.isNaN(minOrderPaise)) validationErrors.MinOrderPaise = copy.invalidValue;
    if (Number.isNaN(maxRedemptions)) validationErrors.MaxRedemptions = copy.invalidValue;
    if (Number.isNaN(perUserLimit)) validationErrors.PerUserLimit = copy.invalidValue;
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    const payload = {
      Code: String(formData.get('Code') ?? '').trim().toUpperCase(),
      Type: type,
      Value: value,
      Description: String(formData.get('Description') ?? '').trim(),
      MaxDiscountPaise: type === 'percent' ? maxDiscountPaise : 0,
      MinOrderPaise: minOrderPaise,
      StartsAt: fromDateTimeInput(formData.get('StartsAt')),
      EndsAt: fromDateTimeInput(formData.get('EndsAt')),
      MaxRedemptions: maxRedemptions,
      PerUserLimit: perUserLimit,
      AppliesToCategories: formData.getAll('AppliesToCategories'),
      IsActive: formData.get('IsActive') === 'on',
    };

    setIsSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      if (isNew) {
        const data = await requestApi('/admin/coupons', { method: 'POST', body: payload });
        router.replace(toLocalized(`/admin/coupons/${data.coupon._id}`));
        return;
      }
      await requestApi(`/admin/coupons/${coupon._id}`, { method: 'PATCH', body: payload });
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
      await requestApi(`/admin/coupons/${coupon._id}`, { method: 'DELETE' });
      router.replace(toLocalized('/admin/coupons'));
    } catch (error) {
      setMessage({ tone: 'error', text: error.status === 409 ? copy.deleteBlocked : localizeApiError(error, dictionary) });
      setIsSaving(false);
      setIsConfirmingDelete(false);
    }
  }

  const selectedCategories = coupon?.AppliesToCategories ?? [];

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AdminPanel>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminField id="coupon-code" label={copy.code} hint={copy.codeHint} error={fieldErrors.Code}>
            <input id="coupon-code" name="Code" required maxLength={40} defaultValue={coupon?.Code ?? ''} className={`font-mono uppercase ${ADMIN_CONTROL_CLASS}`} />
          </AdminField>
          <AdminField id="coupon-type" label={copy.type} error={fieldErrors.Type}>
            <select id="coupon-type" value={type} onChange={(event) => setType(event.target.value)} className={ADMIN_CONTROL_CLASS}>
              {COUPON_TYPES.map((couponType) => (
                <option key={couponType} value={couponType}>
                  {labels.couponType(couponType)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField id="coupon-value" label={copy.value} hint={type === 'percent' ? copy.valueHintPercent : copy.valueHintFlat} error={fieldErrors.Value}>
            <input
              id="coupon-value"
              name="Value"
              inputMode="decimal"
              required
              defaultValue={coupon ? (coupon.Type === 'flat' ? paiseToRupeesInput(coupon.Value) : coupon.Value) : ''}
              className={ADMIN_CONTROL_CLASS}
            />
          </AdminField>
          <AdminField id="coupon-description" label={copy.description} className="sm:col-span-2 lg:col-span-3">
            <input id="coupon-description" name="Description" maxLength={300} defaultValue={coupon?.Description ?? ''} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
          {type === 'percent' && (
            <AdminField id="coupon-max-discount" label={copy.maxDiscount} hint={copy.maxDiscountHint} error={fieldErrors.MaxDiscountPaise}>
              <input
                id="coupon-max-discount"
                name="MaxDiscount"
                inputMode="decimal"
                defaultValue={paiseToRupeesInput(coupon?.MaxDiscountPaise ?? 0)}
                className={ADMIN_CONTROL_CLASS}
              />
            </AdminField>
          )}
          <AdminField id="coupon-min-order" label={copy.minOrder} error={fieldErrors.MinOrderPaise}>
            <input id="coupon-min-order" name="MinOrder" inputMode="decimal" defaultValue={paiseToRupeesInput(coupon?.MinOrderPaise ?? 0)} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
          <AdminField id="coupon-starts" label={copy.startsAt} error={fieldErrors.StartsAt}>
            <input id="coupon-starts" name="StartsAt" type="datetime-local" defaultValue={toDateTimeInput(coupon?.StartsAt)} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
          <AdminField id="coupon-ends" label={copy.endsAt} error={fieldErrors.EndsAt}>
            <input id="coupon-ends" name="EndsAt" type="datetime-local" defaultValue={toDateTimeInput(coupon?.EndsAt)} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
          <AdminField id="coupon-max-redemptions" label={copy.maxRedemptions} hint={copy.unlimitedHint} error={fieldErrors.MaxRedemptions}>
            <input id="coupon-max-redemptions" name="MaxRedemptions" inputMode="numeric" defaultValue={coupon?.MaxRedemptions ?? 0} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
          <AdminField id="coupon-per-user" label={copy.perUserLimit} hint={copy.unlimitedHint} error={fieldErrors.PerUserLimit}>
            <input id="coupon-per-user" name="PerUserLimit" inputMode="numeric" defaultValue={coupon?.PerUserLimit ?? 0} className={ADMIN_CONTROL_CLASS} />
          </AdminField>
        </div>

        <fieldset className="mt-4 border-t border-line pt-3">
          <legend className={ADMIN_LABEL_CLASS}>{copy.categories}</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {PRODUCT_CATEGORY_KEYS.map((categoryKey) => (
              <label key={categoryKey} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="AppliesToCategories"
                  value={categoryKey}
                  defaultChecked={selectedCategories.includes(categoryKey)}
                  className="size-4 accent-primary"
                />
                {labels.productCategory(categoryKey)}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-muted">{copy.categoriesHint}</p>
        </fieldset>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input type="checkbox" name="IsActive" defaultChecked={coupon?.IsActive ?? true} className="size-4 accent-primary" />
            {copy.isActive}
          </label>
          {coupon && <span className="text-xs text-ink-muted">{copy.redemptions(coupon.RedemptionCount ?? 0)}</span>}
        </div>
      </AdminPanel>

      <FormMessage message={message} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? dictionary.admin.common.saving : isNew ? copy.create : copy.save}
        </Button>
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

export function CouponEditor({ couponId }) {
  const copy = useDictionary().adminCommerce;
  const { data, error, isLoading, reload } = useApiData(couponId ? `/admin/coupons/${encodeURIComponent(couponId)}` : null);

  const heading = (
    <div className="mb-4">
      <AdminBackLink href="/admin/coupons">{copy.couponEditor.back}</AdminBackLink>
      <h1 className="mt-2 text-h3 text-ink">{couponId ? copy.pageTitles.editCoupon : copy.pageTitles.newCoupon}</h1>
    </div>
  );

  if (!couponId) {
    return (
      <div>
        {heading}
        <CouponForm />
      </div>
    );
  }
  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (!data?.coupon) return null;

  return (
    <div>
      {heading}
      <CouponForm key={data.coupon.updatedAt} coupon={data.coupon} />
    </div>
  );
}
