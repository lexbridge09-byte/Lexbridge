'use client';

import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { CheckboxField, TextAreaField, TextField } from '@/components/formFields';
import { LanguageSelectField } from '@/components/languageSelectField';
import { LocaleLink } from '@/components/localeLink';
import { Button, Card, InlineAlert, StepIndicator } from '@/components/ui';
import { WhatsAppOptInField } from '@/components/whatsAppOptInField';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { useIsFeatureEnabled } from '@/components/featuresProvider';

const THEME_COLOR = '#7d6130';

function SummaryRow({ label, value, isStrong = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 ${isStrong ? 'border-t border-line pt-3 text-base font-bold text-ink' : 'text-sm text-ink-muted'}`}
    >
      <dt>{label}</dt>
      <dd className={isStrong ? 'font-display text-xl' : 'text-ink'}>{value}</dd>
    </div>
  );
}

function CouponField({ items, appliedCoupon, onApplied, onRemoved, isDisabled, onChecking }) {
  const dictionary = useDictionary();
  const copy = dictionary.commerce.checkout.coupon;
  const [code, setCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const isCheckingRef = useRef(false);

  async function applyCoupon() {
    const couponCode = code.trim().toUpperCase();
    if (!couponCode || isDisabled || isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);
    onChecking(true);
    setError('');
    try {
      const emailInput = document.getElementById('checkout-email');
      const result = await requestApi('/checkout/coupons/validate', {
        method: 'POST',
        body: {
          Items: items,
          CouponCode: couponCode,
          Email: emailInput?.value.trim() || undefined,
        },
      });
      onApplied(result);
    } catch (couponError) {
      setError(localizeApiError(couponError, dictionary));
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
      onChecking(false);
    }
  }

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-success-50 px-3 py-2 text-sm">
        <span className="font-semibold text-success">{copy.applied(appliedCoupon.CouponCode)}</span>
        <button
          type="button"
          disabled={isDisabled}
          onClick={() => {
            setCode('');
            onRemoved();
          }}
          className="font-semibold text-ink-muted hover:text-ink hover:underline"
        >
          {copy.remove}
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="checkout-coupon" className="block text-sm font-semibold text-ink">
        {copy.label}
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="checkout-coupon"
          disabled={isDisabled || isChecking}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              applyCoupon();
            }
          }}
          autoComplete="off"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'checkout-coupon-error' : undefined}
          className="block w-full min-w-0 rounded-xl border border-line-strong bg-card px-3.5 py-2.5 text-[15px] uppercase text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 aria-[invalid=true]:border-danger"
        />
        <Button variant="secondary" size="sm" onClick={applyCoupon} disabled={isDisabled || isChecking || !code.trim()} className="shrink-0">
          {isChecking ? copy.applying : copy.apply}
        </Button>
      </div>
      {error && (
        <p id="checkout-coupon-error" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ product }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const isWhatsAppOptInEnabled = useIsFeatureEnabled('whatsAppNotifications');
  const isCouponsEnabled = useIsFeatureEnabled('coupons');
  const copy = dictionary.commerce.checkout;
  const format = useFormatters();
  const items = [{ Slug: product.Slug }];
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [isCouponChecking, setIsCouponChecking] = useState(false);
  const [details, setDetails] = useState({ FullName: '', Email: '', Phone: '' });
  const editedFieldsRef = useRef(new Set());
  const isBusyRef = useRef(false);

  // Signed-in clients get their details filled in; guests can check out too
  useEffect(() => {
    let isCancelled = false;
    requestApi('/auth/me')
      .then(({ user: signedInUser }) => {
        if (!isCancelled) {
          setDetails((current) => Object.fromEntries(Object.entries(current).map(([field, value]) => [
            field, editedFieldsRef.current.has(field) ? value : signedInUser?.[field] ?? value,
          ])));
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  const subtotalPaise = appliedCoupon?.SubtotalPaise ?? product.PricePaise;
  const discountPaise = appliedCoupon?.DiscountPaise ?? 0;
  const totalPaise = appliedCoupon?.TotalPaise ?? product.PricePaise;

  function goToSuccess(order) {
    const params = new URLSearchParams({ reference: order.ReferenceCode });
    if (order.ServiceRequestReference) params.set('request', order.ServiceRequestReference);
    router.push(toLocalized(`/checkout/success?${params}`));
  }

  async function payOrder(payment) {
    if (isBusyRef.current) return;
    isBusyRef.current = true;
    setPendingPayment(payment);
    setMessage('');
    setIsBusy(true);
    try {
      let response = payment.response;
      if (!response) {
        let result;
        try {
          result = await openRazorpayCheckout(payment.checkout, THEME_COLOR);
        } catch {
          setMessage(copy.scriptFailed);
          return;
        }
        if (result.outcome !== 'paid') {
          setMessage(result.outcome === 'failed' ? copy.failed : copy.dismissed);
          return;
        }
        response = result.response;
        // A verification retry must not reopen checkout or charge the customer again.
        setPendingPayment({ ...payment, response });
      }
      try {
        const { order } = await requestApi('/checkout/verify', {
          method: 'POST',
          body: response,
        });
        goToSuccess(order);
      } catch {
        setMessage(`${copy.verifyFailed} ${copy.orderReference(payment.order.ReferenceCode)}`);
      }
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isBusyRef.current || isCouponChecking) return;
    if (pendingPayment) {
      await payOrder(pendingPayment);
      return;
    }
    const formData = new FormData(event.currentTarget);
    if (formData.get('ConsentGiven') !== 'on') {
      setFieldErrors({ ConsentGiven: copy.consentRequired });
      return;
    }

    isBusyRef.current = true;
    setIsBusy(true);
    setFieldErrors({});
    setMessage('');
    setPendingPayment(null);
    let created;
    try {
      created = await requestApi('/checkout/orders', {
        method: 'POST',
        body: {
          Items: items,
          CouponCode: appliedCoupon?.CouponCode || undefined,
          FullName: String(formData.get('FullName') ?? '').trim(),
          Email: String(formData.get('Email') ?? '').trim(),
          Phone: String(formData.get('Phone') ?? '').trim(),
          Description: String(formData.get('Description') ?? '').trim(),
          PreferredLanguage: formData.get('PreferredLanguage'),
          WhatsAppOptIn: formData.get('WhatsAppOptIn') === 'on',
          ConsentGiven: true,
        },
      });
    } catch (error) {
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setMessage(error.status === 503 ? copy.notSetUp : localizeApiError(error, dictionary));
      isBusyRef.current = false;
      setIsBusy(false);
      return;
    }

    // A fully discounted order is already paid
    if (!created.checkout) {
      goToSuccess(created.order);
      return;
    }
    isBusyRef.current = false;
    await payOrder(created);
  }

  function updateDetails(event) {
    const { name, value } = event.target;
    editedFieldsRef.current.add(name);
    setDetails((current) => ({ ...current, [name]: value }));
  }

  const isFree = totalPaise === 0;

  return (
    <>
      <StepIndicator
        label={dictionary.ux.steps.label}
        steps={dictionary.ux.steps.checkout}
        current={pendingPayment ? 2 : 1}
        className="mb-4"
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem] lg:gap-8">
        <Card padding="md" className="order-2 lg:order-1">
          <h2 className="text-h4 text-ink">{copy.detailsTitle}</h2>
          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4" aria-busy={isBusy}>
            <fieldset disabled={isBusy || Boolean(pendingPayment)} className="min-w-0 space-y-4">
              <legend className="sr-only">{copy.detailsTitle}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="checkout-name"
                label={copy.fullName}
                name="FullName"
                autoComplete="name"
                value={details.FullName}
                onChange={updateDetails}
                required
                error={fieldErrors.FullName}
              />
              <TextField
                id="checkout-email"
                label={copy.email}
                name="Email"
                type="email"
                autoComplete="email"
                value={details.Email}
                onChange={updateDetails}
                required
                error={fieldErrors.Email}
              />
              <TextField
                id="checkout-phone"
                label={copy.phone}
                name="Phone"
                type="tel"
                autoComplete="tel"
                placeholder={copy.phonePlaceholder}
                value={details.Phone}
                onChange={updateDetails}
                required
                error={fieldErrors.Phone}
              />
              <LanguageSelectField id="checkout-language" label={copy.languageLabel} />
            </div>
            <TextAreaField
              id="checkout-description"
              label={copy.descriptionLabel}
              name="Description"
              rows={3}
              maxLength={5000}
              hint={copy.descriptionHint}
              error={fieldErrors.Description}
            />
            <CheckboxField id="checkout-consent" name="ConsentGiven" error={fieldErrors.ConsentGiven}>
              {copy.consentBefore}
              <LocaleLink href="/legal/terms" className="font-semibold text-primary-dark underline underline-offset-4">
                {copy.consentLink}
              </LocaleLink>
              {copy.consentAfter}
            </CheckboxField>
            {isWhatsAppOptInEnabled && <WhatsAppOptInField />}
            </fieldset>

            {message && (
              <InlineAlert tone="error">
                <p>{message}</p>
              </InlineAlert>
            )}

            <Button type="submit" size="lg" isFullWidth disabled={isBusy || isCouponChecking}>
              {isBusy ? copy.processing : pendingPayment?.response ? copy.verifyPayment : pendingPayment ? copy.retry : isFree ? copy.placeOrder : copy.pay(format.rupees(totalPaise))}
            </Button>
            {pendingPayment && !pendingPayment.response && (
              <Button variant="link" disabled={isBusy} onClick={() => { setPendingPayment(null); setMessage(''); }}>
                {copy.editDetails}
              </Button>
            )}
            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Lock aria-hidden="true" className="size-3.5 text-success" strokeWidth={2} />
                {dictionary.ux.checkoutTrust.secure}
              </span>
              <span aria-hidden="true">·</span>
              <LocaleLink href="/legal/refund-cancellation" className="font-semibold text-primary-dark hover:underline">
                {dictionary.ux.checkoutTrust.refundPolicy}
              </LocaleLink>
            </p>
          </form>
        </Card>

        <Card as="aside" padding="md" aria-labelledby="order-summary-title" className="order-1 lg:sticky lg:top-24 lg:order-2">
          <h2 id="order-summary-title" className="text-h4 text-ink">
            {copy.summaryTitle}
          </h2>
          <div className="mt-3 rounded-xl bg-card-dim p-3">
            <p className="font-semibold text-ink">{product.Title}</p>
            {product.TurnaroundText && <p className="text-xs text-ink-muted">{product.TurnaroundText}</p>}
          </div>
          <dl className="mt-4 space-y-2">
            <SummaryRow label={copy.subtotal} value={format.rupees(subtotalPaise)} />
            {discountPaise > 0 && <SummaryRow label={copy.discount} value={`− ${format.rupees(discountPaise)}`} />}
            <SummaryRow label={copy.total} value={format.rupees(totalPaise)} isStrong />
          </dl>
          {isCouponsEnabled && (
            <div className="mt-4 border-t border-line pt-4">
              <CouponField
                items={items}
                appliedCoupon={appliedCoupon}
                isDisabled={isBusy || Boolean(pendingPayment)}
                onChecking={setIsCouponChecking}
                onApplied={setAppliedCoupon}
                onRemoved={() => setAppliedCoupon(null)}
              />
            </div>
          )}
          {product.GovernmentFeeNote && <p className="mt-3 text-xs leading-5 text-ink-muted">{product.GovernmentFeeNote}</p>}
        </Card>
      </div>
    </>
  );
}
