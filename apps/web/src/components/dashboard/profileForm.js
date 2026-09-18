'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { TextField } from '@/components/formFields';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Button, Card } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

export function ProfileForm() {
  const dictionary = useDictionary();
  const copy = dictionary.dashboard.profile;
  const { data, error, isLoading, reload } = useApiData('/auth/me');
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const updates = {};
    const fullName = String(formData.get('FullName') ?? '').trim();
    const phone = String(formData.get('Phone') ?? '').trim();
    if (fullName) updates.FullName = fullName;
    if (phone) updates.Phone = phone;

    setIsSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      await requestApi('/auth/me', { method: 'PATCH', body: updates });
      setMessage({ tone: 'success', text: copy.saved });
      reload();
    } catch (saveError) {
      if (saveError.status === 401) {
        redirectToLogin();
        return;
      }
      setFieldErrors(localizeFieldErrors(saveError, dictionary));
      setMessage({ tone: 'error', text: localizeApiError(saveError, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const user = data?.user;
  if (!user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-h3 text-ink">{copy.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">{copy.intro}</p>
      </div>

      <Card padding="md" className="max-w-2xl">
        <form key={`${user.FullName}-${user.Phone}`} onSubmit={handleSubmit} noValidate className="space-y-4">
          <TextField label={copy.fullName} name="FullName" autoComplete="name" defaultValue={user.FullName} error={fieldErrors.FullName} />
          <TextField
            label={copy.phone}
            name="Phone"
            type="tel"
            autoComplete="tel"
            placeholder={copy.phonePlaceholder}
            defaultValue={user.Phone}
            error={fieldErrors.Phone}
          />
          <div className="rounded-xl bg-surface-alt px-4 py-3">
            <p className="text-xs font-semibold text-ink-muted">{copy.emailLabel}</p>
            <p className="mt-0.5 text-ink">{user.Email}</p>
            <p className="mt-1 text-xs text-ink-muted">{copy.emailNote}</p>
          </div>
          <FormMessage message={message} />
          <Button type="submit" disabled={isSaving}>
            {isSaving ? copy.saving : copy.save}
          </Button>
        </form>
      </Card>
    </div>
  );
}
