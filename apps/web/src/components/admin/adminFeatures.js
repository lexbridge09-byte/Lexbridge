'use client';

import { useDictionary } from '@/brand/localeContext';
import { AdminPageHeading, AdminPanel } from '@/components/admin/adminStyles';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { useApiData } from '@/lib/useApiData';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useState } from 'react';

function FlagToggle({ flag, labels, summaries, copy, onChanged }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  async function toggle() {
    setIsSaving(true);
    setError(null);
    try {
      const { flags } = await requestApi(`/admin/feature-flags/${flag.key}`, {
        method: 'PATCH',
        body: { enabled: !flag.stored },
      });
      onChanged(flags);
    } catch (err) {
      setError(err);
    } finally {
      setIsSaving(false);
    }
  }

  const isEffectivelyOff = flag.stored && !flag.effective;
  const dependentCount = flag.dependents.length;

  return (
    <li className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">
          {labels[flag.key] ?? flag.key}
          {isEffectivelyOff && (
            <span className="ml-2 rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning">
              {copy.disabledByDependency}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-muted">{summaries[flag.key] ?? ''}</p>
        {(flag.dependencies.length > 0 || dependentCount > 0) && (
          <p className="mt-1 text-xs text-ink-subtle">
            {flag.dependencies.length > 0 && (
              <span>
                {copy.needs}: {flag.dependencies.map((dependency) => labels[dependency] ?? dependency).join(', ')}
              </span>
            )}
            {flag.dependencies.length > 0 && dependentCount > 0 && ' · '}
            {dependentCount > 0 && (
              <span>
                {copy.dependents}: {flag.dependents.map((dependent) => labels[dependent] ?? dependent).join(', ')}
              </span>
            )}
          </p>
        )}
        {error && <p className="mt-1 text-xs text-danger">{localizeApiError(error)}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={flag.stored}
        aria-label={labels[flag.key] ?? flag.key}
        onClick={toggle}
        disabled={isSaving}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-150 ${flag.stored ? 'bg-primary' : 'bg-line-strong'} ${isSaving ? 'opacity-60' : ''}`}
      >
        <span
          aria-hidden="true"
          className={`inline-block size-5 rounded-full bg-card shadow-sm transition-transform duration-150 ${flag.stored ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </li>
  );
}

export function AdminFeatures() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.features;
  const featureLabels = dictionary.admin.featureLabels;
  const featureSummaries = dictionary.admin.featureSummaries;
  const { data, error, isLoading, reload } = useApiData('/admin/feature-flags');
  const [flags, setFlags] = useState(null);
  const items = flags ?? data?.flags ?? [];

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />
      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <AdminPanel>
          <ul className="-m-4 divide-y divide-line sm:-m-5">
            {items.map((flag) => (
              <FlagToggle
                key={flag.key}
                flag={flag}
                labels={featureLabels}
                summaries={featureSummaries}
                copy={copy}
                onChanged={setFlags}
              />
            ))}
          </ul>
          <p className="mt-3 px-4 text-xs text-ink-muted sm:px-5">{copy.propagationNote}</p>
        </AdminPanel>
      )}
    </div>
  );
}
