'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, AdminPageHeading, AdminPanel } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { SlotStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { formatDateKey } from '@/lib/formatValues';
import { useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const DURATION_OPTIONS = [20, 30, 45, 60];
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseStartTimes(value) {
  const times = value
    .split(/[\s,]+/)
    .map((time) => time.trim())
    .filter(Boolean)
    .map((time) => (/^\d:\d\d$/.test(time) ? `0${time}` : time));
  const invalidTimes = times.filter((time) => !TIME_PATTERN.test(time));
  return { times: [...new Set(times)].sort(), invalidTimes };
}

function CreateSlotsForm({ onCreated }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots.create;
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const date = String(formData.get('Date') ?? '');
    const { times, invalidTimes } = parseStartTimes(String(formData.get('StartTimes') ?? ''));

    if (!date) {
      setMessage({ tone: 'error', text: copy.chooseDate });
      return;
    }
    if (times.length === 0 || invalidTimes.length > 0) {
      setMessage({ tone: 'error', text: invalidTimes.length ? copy.invalidTimes(invalidTimes.join(', ')) : copy.addTime });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const data = await requestApi('/admin/slots', {
        method: 'POST',
        body: { Date: date, StartTimes: times, DurationMinutes: Number(formData.get('DurationMinutes')) },
      });
      setMessage({ tone: 'success', text: copy.added(data.created, data.skipped) });
      form.reset();
      onCreated();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPanel as="form" title={copy.title} onSubmit={handleSubmit}>
      <div className="space-y-3">
        <div>
          <label htmlFor="slot-date" className={ADMIN_LABEL_CLASS}>
            {copy.date}
          </label>
          <input id="slot-date" name="Date" type="date" required className={`mt-1 ${ADMIN_CONTROL_CLASS}`} />
        </div>
        <div>
          <label htmlFor="slot-times" className={ADMIN_LABEL_CLASS}>
            {copy.times}
          </label>
          <input
            id="slot-times"
            name="StartTimes"
            type="text"
            required
            placeholder={copy.timesPlaceholder}
            aria-describedby="slot-times-hint"
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
          <p id="slot-times-hint" className="mt-1 text-xs text-ink-muted">
            {copy.timesHint}
          </p>
        </div>
        <div>
          <label htmlFor="slot-duration" className={ADMIN_LABEL_CLASS}>
            {copy.duration}
          </label>
          <select id="slot-duration" name="DurationMinutes" defaultValue="30" className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {copy.minutes(minutes)}
              </option>
            ))}
          </select>
        </div>
        <FormMessage message={message} />
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving ? copy.adding : copy.submit}
        </Button>
      </div>
    </AdminPanel>
  );
}

export function AdminSlots() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/admin/slots');
  const [deletingId, setDeletingId] = useState('');
  const [deleteMessage, setDeleteMessage] = useState(null);

  async function handleDelete(slotId) {
    setDeletingId(slotId);
    setDeleteMessage(null);
    try {
      await requestApi(`/admin/slots/${encodeURIComponent(slotId)}`, { method: 'DELETE' });
      reload();
    } catch (deleteError) {
      if (deleteError.status === 401) {
        redirectToLogin();
        return;
      }
      setDeleteMessage({ tone: 'error', text: localizeApiError(deleteError, dictionary) });
    } finally {
      setDeletingId('');
    }
  }

  const slots = [...(data?.slots ?? [])].sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt));
  const slotGroups = [];
  for (const slot of slots) {
    const dateKey = formatDateKey(slot.StartsAt);
    const lastGroup = slotGroups[slotGroups.length - 1];
    if (lastGroup?.dateKey === dateKey) lastGroup.daySlots.push(slot);
    else slotGroups.push({ dateKey, daySlots: [slot] });
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="slots-heading" className="order-2 space-y-3 lg:order-1">
          <h2 id="slots-heading" className="sr-only">
            {copy.listLabel}
          </h2>
          <FormMessage message={deleteMessage} />
          {isLoading && !data ? (
            <LoadingNote />
          ) : error ? (
            <ErrorNote error={error} onRetry={reload} />
          ) : slotGroups.length === 0 ? (
            <p className="text-sm text-ink-muted">{copy.empty}</p>
          ) : (
            slotGroups.map((group) => (
              <AdminPanel key={group.dateKey} title={format.day(group.daySlots[0].StartsAt)}>
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {group.daySlots.map((slot) => (
                    <li key={slot._id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                      <span>
                        <span className="font-semibold text-ink">{format.time(slot.StartsAt)}</span>
                        <span className="ml-1.5 text-xs text-ink-muted">{copy.durationShort(slot.DurationMinutes)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <SlotStatusBadge status={slot.Status} />
                        {slot.Status !== 'booked' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(slot._id)}
                            disabled={deletingId === slot._id}
                            aria-label={copy.deleteLabel(format.time(slot.StartsAt), format.day(slot.StartsAt))}
                            className="text-xs font-semibold text-danger hover:underline disabled:opacity-60"
                          >
                            {deletingId === slot._id ? copy.deleting : copy.delete}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </AdminPanel>
            ))
          )}
        </section>

        <div className="order-1 lg:sticky lg:top-24 lg:order-2">
          <CreateSlotsForm onCreated={reload} />
        </div>
      </div>
    </div>
  );
}
