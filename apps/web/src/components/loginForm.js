'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { TextField } from '@/components/formFields';
import { FormMessage } from '@/components/loadState';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { deriveLoginRedirect } from '@/lib/safeRedirect';
import { refreshSession } from '@/lib/session';

const RESEND_COOLDOWN_SECONDS = 30;

export function LoginForm({ nextPath = '' }) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = useDictionary();
  const copy = dictionary.auth;
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  // Already signed in: skip the form
  useEffect(() => {
    let isCancelled = false;
    requestApi('/auth/me')
      .then(({ user }) => {
        if (!isCancelled) router.replace(deriveLoginRedirect(nextPath, user, locale));
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [nextPath, router, locale]);

  useEffect(() => {
    if (secondsUntilResend <= 0) return undefined;
    const timer = setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsUntilResend]);

  function showError(error) {
    setFieldErrors(localizeFieldErrors(error, dictionary));
    setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
  }

  async function sendCode(emailAddress) {
    setIsBusy(true);
    setFieldErrors({});
    setMessage(null);
    try {
      await requestApi('/auth/request-otp', { method: 'POST', body: { Email: emailAddress } });
      setEmail(emailAddress);
      setStep('code');
      setSecondsUntilResend(RESEND_COOLDOWN_SECONDS);
      setMessage({ tone: 'success', text: copy.code.sent(emailAddress) });
    } catch (error) {
      showError(error);
    } finally {
      setIsBusy(false);
    }
  }

  function handleEmailSubmit(event) {
    event.preventDefault();
    const emailAddress = String(new FormData(event.currentTarget).get('Email') ?? '').trim();
    sendCode(emailAddress);
  }

  async function handleCodeSubmit(event) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get('Code') ?? '').replace(/\s/g, '');
    setIsBusy(true);
    setFieldErrors({});
    setMessage(null);
    try {
      const { user } = await requestApi('/auth/verify-otp', { method: 'POST', body: { Email: email, Code: code } });
      refreshSession();
      router.replace(deriveLoginRedirect(nextPath, user, locale));
      router.refresh();
    } catch (error) {
      // A wrong or expired code comes back as a 400 without field details; keep the API's specific wording
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setMessage({ tone: 'error', text: error.status === 400 ? error.message : localizeApiError(error, dictionary) });
      setIsBusy(false);
    }
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleCodeSubmit} noValidate className="space-y-5">
        <FormMessage message={message} />
        {/* Distinct keys stop React reusing the email <input>, which would carry the typed email into this field */}
        <TextField
          key="code-field"
          label={copy.code.label}
          name="Code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          hint={copy.code.hint}
          required
          autoFocus
          error={fieldErrors.Code}
          className="max-w-xs"
        />
        <Button type="submit" size="lg" disabled={isBusy} isFullWidth>
          {isBusy ? copy.code.busy : copy.code.submit}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <Button variant="link" disabled={isBusy || secondsUntilResend > 0} onClick={() => sendCode(email)} className="disabled:text-ink-muted">
            {secondsUntilResend > 0 ? copy.code.resendIn(secondsUntilResend) : copy.code.resend}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setStep('email');
              setMessage(null);
              setFieldErrors({});
            }}
            className="text-ink-muted"
          >
            {copy.code.differentEmail}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} noValidate className="space-y-5">
      <FormMessage message={message?.tone === 'error' && !fieldErrors.Email ? message : null} />
      <TextField
        key="email-field"
        label={copy.email.label}
        name="Email"
        type="email"
        autoComplete="email"
        defaultValue={email}
        hint={copy.email.hint}
        required
        autoFocus
        error={fieldErrors.Email}
      />
      <Button type="submit" size="lg" disabled={isBusy} isFullWidth>
        {isBusy ? copy.email.busy : copy.email.submit}
      </Button>
    </form>
  );
}
