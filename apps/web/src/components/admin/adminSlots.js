'use client';

import { CalendarClock, ChevronLeft, ChevronRight, Globe, Link2, Plus, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getLocaleTag } from '@/brand/locales';
import { useDictionary, useLocale } from '@/brand/localeContext';
import { AdminPageHeading, AdminPanel } from '@/components/admin/adminStyles';
import { TextField } from '@/components/formFields';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { InfoTip } from '@/components/infoTip';
import { LocaleLink } from '@/components/localeLink';
import { Select } from '@/components/selectMenu';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { formatDateKey } from '@/lib/formatValues';
import { useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const DURATION_OPTIONS = [20, 30, 45, 60];
// Monday-first display order (0 = Sunday)
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SLOT_TONE_CLASSES = {
  open: 'border-success/30 bg-success-50 text-success',
  booked: 'border-primary/40 bg-primary-50 text-primary-dark',
  blocked: 'border-line bg-card-dim text-ink-muted',
};

// Seats taken at a time (older slots without BookedCount: one seat if a consultation is attached)
function deriveBookedSeats(slot) {
  return slot.BookedCount ?? (slot.Consultation ? 1 : 0);
}

// IST date key (YYYY-MM-DD) for "today", and the Monday that starts a week containing a date key
function deriveTodayKey() {
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function deriveWeekStartKey(dateKey) {
  const day = new Date(`${dateKey}T00:00:00Z`);
  const mondayOffset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - mondayOffset * DAY_MS).toISOString().slice(0, 10);
}

function deriveShiftedKey(dateKey, days) {
  return new Date(new Date(`${dateKey}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/*
  Calendar tab — month grid with an agenda for the selected day (month-agenda pattern): each day shows
  its open/booked counts, the selected day lists every slot (remove one, clear the day, booked slots link
  to their consultation). One request per visible month (6 weeks of cells).
*/
function SlotsCalendar() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots;
  const format = useFormatters();
  const locale = useLocale();
  const todayKey = deriveTodayKey();
  const [monthKey, setMonthKey] = useState(todayKey.slice(0, 7));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState(null);

  // 6×7 cells from the Monday on/before the 1st
  const gridStartKey = deriveWeekStartKey(`${monthKey}-01`);
  const gridEndKey = deriveShiftedKey(gridStartKey, 42);
  const rangeQuery = `from=${gridStartKey}T00:00:00%2B05:30&to=${gridEndKey}T00:00:00%2B05:30`;
  const { data, error, isLoading, reload } = useApiData(`/admin/slots?${rangeQuery}`);

  const slotsByDay = useMemo(() => {
    const byDay = new Map();
    for (const slot of data?.slots ?? []) {
      const dateKey = formatDateKey(slot.StartsAt);
      if (!byDay.has(dateKey)) byDay.set(dateKey, []);
      byDay.get(dateKey).push(slot);
    }
    for (const daySlots of byDay.values()) daySlots.sort((a, b) => new Date(a.StartsAt) - new Date(b.StartsAt));
    return byDay;
  }, [data]);
  const cells = Array.from({ length: 42 }, (_, index) => deriveShiftedKey(gridStartKey, index));
  const selectedSlots = slotsByDay.get(selectedKey) ?? [];
  const monthLabel = new Intl.DateTimeFormat(getLocaleTag(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${monthKey}-01T00:00:00Z`));
  const weekdayLabels = [1, 2, 3, 4, 5, 6, 0].map((weekday) => copy.create.weekdaysShort[weekday]);

  function shiftMonth(step) {
    const [year, month] = monthKey.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1 + step, 1));
    setMonthKey(next.toISOString().slice(0, 7));
  }

  async function runAction(busyKey, path, successText) {
    setBusyId(busyKey);
    setMessage(null);
    try {
      const result = await requestApi(path, { method: 'DELETE' });
      if (successText) setMessage({ tone: 'success', text: successText(result) });
      reload();
    } catch (actionError) {
      if (actionError.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(actionError, dictionary) });
    } finally {
      setBusyId('');
    }
  }

  const selectedLabel = format.day(`${selectedKey}T12:00:00+05:30`);
  const canClearSelected = selectedKey >= todayKey && selectedSlots.some((slot) => slot.Status !== 'booked');

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="slots-month" className="min-w-0 rounded-card border border-line bg-card p-3 sm:p-4">
        {/* Month navigation */}
        <div className="mb-3 flex items-center gap-2">
          <h2 id="slots-month" className="font-heading text-2xl font-bold text-ink">{monthLabel}</h2>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label={copy.previousWeek} className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink">
              <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => {
                setMonthKey(todayKey.slice(0, 7));
                setSelectedKey(todayKey);
              }}
              className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-ink transition-colors duration-(--dur-150) hover:border-primary/60"
            >
              {copy.thisWeek}
            </button>
            <button type="button" onClick={() => shiftMonth(1)} aria-label={copy.nextWeek} className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink">
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {isLoading && !data ? (
          <LoadingNote />
        ) : error ? (
          <ErrorNote error={error} onRetry={reload} />
        ) : (
          <div role="grid" aria-label={monthLabel}>
            <div role="row" className="grid grid-cols-7 pb-1">
              {weekdayLabels.map((label) => (
                <span key={label} role="columnheader" className="text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  {label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((dateKey) => {
                const daySlots = slotsByDay.get(dateKey) ?? [];
                // Seats, not times: a time with 3 lawyers and 1 booking adds 2 open and 1 booked
                const bookedCount = daySlots.reduce((sum, slot) => sum + deriveBookedSeats(slot), 0);
                const openCount = daySlots.filter((slot) => slot.Status !== 'blocked').reduce((sum, slot) => sum + Math.max(0, (slot.Capacity ?? 1) - deriveBookedSeats(slot)), 0);
                const isInMonth = dateKey.startsWith(monthKey);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedKey;
                const isPast = dateKey < todayKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    role="gridcell"
                    aria-selected={isSelected}
                    onClick={() => setSelectedKey(dateKey)}
                    className={`flex min-h-14 flex-col items-start rounded-lg border p-1 text-left transition-colors duration-(--dur-100) sm:min-h-16 ${isSelected ? 'border-primary bg-primary-50' : 'border-transparent hover:bg-card-dim'} ${isInMonth ? '' : 'opacity-40'} ${isPast && !isSelected ? 'text-ink-muted' : 'text-ink'}`}
                  >
                    <span className={`tabular flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-primary text-canvas' : ''}`}>
                      {Number(dateKey.slice(8))}
                    </span>
                    <span className="mt-auto flex w-full flex-col gap-0.5">
                      {openCount > 0 && (
                        <span className="truncate rounded bg-success-50 px-1 text-[10px] font-semibold text-success">{copy.openCount(openCount)}</span>
                      )}
                      {bookedCount > 0 && (
                        <span className="truncate rounded bg-primary-100 px-1 text-[10px] font-semibold text-primary-dark">{copy.bookedCount(bookedCount)}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Agenda for the selected day */}
      <aside className="rounded-card border border-line bg-card p-4 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-xl font-bold text-ink">{selectedLabel}</h3>
          {canClearSelected && (
            <button
              type="button"
              onClick={() => runAction(`day-${selectedKey}`, `/admin/slots?date=${selectedKey}`, (result) => copy.cleared(result.deleted))}
              disabled={busyId === `day-${selectedKey}`}
              aria-label={copy.clearDayLabel(selectedLabel)}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            >
              {copy.clearDay}
            </button>
          )}
        </div>
        <div className="mt-2">
          <FormMessage message={message} />
        </div>
        {selectedSlots.length === 0 ? (
          <p className="mt-3 text-sm text-ink-muted">{copy.dayEmpty}</p>
        ) : (
          <ul className="scroll-soft mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
            {selectedSlots.map((slot) => (
              <li key={slot._id} className={`group flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${SLOT_TONE_CLASSES[slot.Status] ?? SLOT_TONE_CLASSES.blocked}`}>
                <span className="tabular font-semibold">{format.time(slot.StartsAt)}</span>
                <span className="text-xs opacity-75">{copy.durationShort(slot.DurationMinutes)}</span>
                {(slot.Capacity ?? 1) > 1 && <span className="tabular text-xs font-semibold">{copy.availability.seats(deriveBookedSeats(slot), slot.Capacity)}</span>}
                {deriveBookedSeats(slot) > 0 && slot.Consultation?.ReferenceCode ? (
                  <LocaleLink href={`/admin/consultations?q=${slot.Consultation.ReferenceCode}`} className="ml-auto font-mono text-xs underline-offset-2 hover:underline">
                    {slot.Consultation.ReferenceCode}
                  </LocaleLink>
                ) : (
                  deriveBookedSeats(slot) === 0 && (
                    <button
                      type="button"
                      onClick={() => runAction(slot._id, `/admin/slots/${encodeURIComponent(slot._id)}`)}
                      disabled={busyId === slot._id}
                      aria-label={copy.deleteLabel(format.time(slot.StartsAt), selectedLabel)}
                      className="ml-auto flex size-7 items-center justify-center rounded-full transition-colors duration-(--dur-150) hover:bg-danger/15 hover:text-danger disabled:opacity-50"
                    >
                      <X aria-hidden="true" className="size-4" strokeWidth={2} />
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Bookable times a set of ranges gives at a slot length
function countRangeSlots(ranges, durationMinutes) {
  return ranges.reduce((sum, range) => sum + Math.max(0, Math.floor((toMinutes(range.To) - toMinutes(range.From)) / durationMinutes)), 0);
}

const ICON_BUTTON_CLASS = 'flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--dur-150)';
// Paint grid: half-hour rows from 08:00 to 21:00 (26 rows)
const GRID_START_MINUTES = 8 * 60;
const GRID_ROW_COUNT = 26;
const GRID_TIMES = Array.from({ length: GRID_ROW_COUNT }, (_, row) => toTime(GRID_START_MINUTES + row * 30));
const CAPACITY_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];

function toTime(totalMinutes) {
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

// Saved ranges → painted cells, as a Set of "weekday-row" keys
function deriveCellsFromWeekly(weekly) {
  const cells = new Set();
  for (const day of weekly ?? []) {
    for (const range of day.Ranges ?? []) {
      for (let row = 0; row < GRID_ROW_COUNT; row += 1) {
        const start = GRID_START_MINUTES + row * 30;
        if (start >= toMinutes(range.From) && start + 30 <= toMinutes(range.To)) cells.add(`${day.Weekday}-${row}`);
      }
    }
  }
  return cells;
}

// Painted cells → ranges per weekday (contiguous cells merge; a gap is a break)
function deriveWeeklyFromCells(cells) {
  return WEEKDAY_ORDER.map((weekday) => {
    const ranges = [];
    let start = null;
    for (let row = 0; row <= GRID_ROW_COUNT; row += 1) {
      const isOn = row < GRID_ROW_COUNT && cells.has(`${weekday}-${row}`);
      if (isOn && start === null) start = row;
      if (!isOn && start !== null) {
        ranges.push({ From: toTime(GRID_START_MINUTES + start * 30), To: toTime(GRID_START_MINUTES + row * 30) });
        start = null;
      }
    }
    return { Weekday: weekday, Ranges: ranges };
  }).filter((day) => day.Ranges.length > 0);
}

/*
  Availability, rebuilt as a paint grid (When2meet pattern): Mon–Sun × half hours. Click or drag to mark
  bookable time; a gap is a break; clicking a day name fills/clears the day. Invalid ranges can't exist.
  Keyboard (ARIA grid): one tab stop, arrows move, Space/Enter toggles. Touch paints without scrolling.
  One Save keeps bookable times in sync (8 weeks); "Lawyers available" = clients each time can take.
*/
function AvailabilityEditor({ availability, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots.availability;
  const hoursCopy = dictionary.admin.slots.hours;
  const format = useFormatters();
  const isReduced = useReducedMotion();
  const todayKey = deriveTodayKey();
  const [cells, setCells] = useState(() => deriveCellsFromWeekly(availability.Weekly));
  const [daysOff, setDaysOff] = useState(() => (availability.Overrides ?? []).filter((override) => override.Date >= todayKey && override.Ranges.length === 0).map((override) => override.Date));
  const [durationMinutes, setDurationMinutes] = useState(String(availability.DurationMinutes ?? 30));
  const [capacity, setCapacity] = useState(String(availability.Capacity ?? 1));
  const [newDayOff, setNewDayOff] = useState('');
  const [focusCell, setFocusCell] = useState({ column: 0, row: 4 });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const paintRef = useRef(null);
  const gridRef = useRef(null);

  // Stop painting wherever the pointer is released
  useEffect(() => {
    function endPaint() {
      paintRef.current = null;
    }
    window.addEventListener('pointerup', endPaint);
    window.addEventListener('pointercancel', endPaint);
    return () => {
      window.removeEventListener('pointerup', endPaint);
      window.removeEventListener('pointercancel', endPaint);
    };
  }, []);

  function setCell(key, isOn) {
    setCells((current) => {
      if (current.has(key) === isOn) return current;
      const next = new Set(current);
      if (isOn) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function startPaint(key) {
    const isOn = !cells.has(key);
    paintRef.current = isOn;
    setCell(key, isOn);
  }

  // Touch: find the cell under the finger as it moves
  function continueTouchPaint(event) {
    if (paintRef.current === null || event.pointerType === 'mouse') return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]');
    if (target) setCell(target.dataset.cell, paintRef.current);
  }

  function toggleDay(weekday) {
    const dayKeys = GRID_TIMES.map((_, row) => `${weekday}-${row}`);
    const isFull = dayKeys.every((key) => cells.has(key));
    setCells((current) => {
      const next = new Set(current);
      for (const key of dayKeys) {
        if (isFull) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function applyPreset(preset) {
    setCells((current) => {
      const next = new Set(preset === 'clear' ? [] : current);
      if (preset === 'weekdays') {
        for (const weekday of [1, 2, 3, 4, 5]) {
          for (let row = 4; row < 20; row += 1) next.add(`${weekday}-${row}`); // 10:00–18:00
        }
      }
      if (preset === 'lunch') {
        for (const weekday of WEEKDAY_ORDER) {
          next.delete(`${weekday}-10`); // 13:00
          next.delete(`${weekday}-11`); // 13:30
        }
      }
      return next;
    });
  }

  function handleGridKeys(event) {
    const moves = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    if (moves[event.key]) {
      event.preventDefault();
      const [columnStep, rowStep] = moves[event.key];
      const next = {
        column: Math.min(6, Math.max(0, focusCell.column + columnStep)),
        row: Math.min(GRID_ROW_COUNT - 1, Math.max(0, focusCell.row + rowStep)),
      };
      setFocusCell(next);
      gridRef.current?.querySelector(`[data-cell="${WEEKDAY_ORDER[next.column]}-${next.row}"]`)?.focus();
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      const key = `${WEEKDAY_ORDER[focusCell.column]}-${focusCell.row}`;
      setCell(key, !cells.has(key));
    }
  }

  const weekly = useMemo(() => deriveWeeklyFromCells(cells), [cells]);

  // Next 7 days as clients will see them (a day off closes the date)
  const preview = Array.from({ length: 7 }, (_, index) => {
    const dateKey = deriveShiftedKey(todayKey, index);
    const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
    const ranges = daysOff.includes(dateKey) ? [] : (weekly.find((day) => day.Weekday === weekday)?.Ranges ?? []);
    return { dateKey, count: countRangeSlots(ranges, Number(durationMinutes)) * Number(capacity) };
  });

  async function save() {
    setIsSaving(true);
    setMessage(null);
    try {
      const keptOverrides = (availability.Overrides ?? []).filter((override) => override.Ranges.length > 0 && override.Date >= todayKey);
      const result = await requestApi('/admin/availability', {
        method: 'PUT',
        body: {
          Provider: availability.Provider ?? 'builtin',
          CalendlyUrl: availability.CalendlyUrl ?? '',
          Weekly: weekly,
          Overrides: [...keptOverrides, ...daysOff.map((date) => ({ Date: date, Ranges: [] }))],
          DurationMinutes: Number(durationMinutes),
          Capacity: Number(capacity),
          PublishWeeks: availability.PublishWeeks ?? 8,
        },
      });
      setMessage({ tone: 'success', text: copy.saved(result.sync?.bookable ?? 0) });
      onSaved();
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

  const dayLabel = (dateKey) => format.shortDay(`${dateKey}T12:00:00+05:30`);

  return (
    <div className="space-y-4">
      {/* Top bar: the question, slot length, lawyers available, Save */}
      <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-heading text-2xl font-bold text-ink">{copy.title}</h2>
            <InfoTip>{copy.gridHint}</InfoTip>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
            <Globe aria-hidden="true" className="size-3.5" strokeWidth={2} />
            {copy.timezone}
          </p>
        </div>
        <div className="w-32">
          <label htmlFor="availability-duration" className="block text-xs font-semibold text-ink-muted">{hoursCopy.duration}</label>
          <Select id="availability-duration" name="DurationMinutes" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)}>
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={String(minutes)}>{dictionary.admin.slots.durationShort(minutes)}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <span className="flex items-center gap-1">
            <label htmlFor="availability-capacity" className="block text-xs font-semibold text-ink-muted">{copy.capacity}</label>
            <InfoTip>{copy.capacityHint}</InfoTip>
          </span>
          <Select id="availability-capacity" name="Capacity" value={capacity} onChange={(event) => setCapacity(event.target.value)}>
            {CAPACITY_OPTIONS.map((count) => (
              <option key={count} value={String(count)}>{count}</option>
            ))}
          </Select>
        </div>
        <Button isLoading={isSaving} onClick={save} className="min-w-28">
          {copy.save}
        </Button>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div initial={isReduced ? false : { opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <FormMessage message={message} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Paint grid */}
        <section aria-label={copy.weeklyTitle} className="rounded-card border border-line bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {[
              ['weekdays', copy.presetWeekdays],
              ['lunch', copy.presetLunch],
              ['clear', copy.clearAll],
            ].map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-(--dur-150) active:scale-(--press-scale) ${preset === 'clear' ? 'border-line text-ink-muted hover:border-danger/50 hover:text-danger' : 'border-primary/40 text-primary-dark hover:bg-primary-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label={copy.weeklyTitle}
            onKeyDown={handleGridKeys}
            onPointerMove={continueTouchPaint}
            className="select-none overflow-x-auto [touch-action:none]"
          >
            <div role="row" className="grid grid-cols-[3.5rem_repeat(7,minmax(2.75rem,1fr))] gap-x-2 pb-2">
              <span aria-hidden="true" />
              {WEEKDAY_ORDER.map((weekday) => (
                <button
                  key={weekday}
                  type="button"
                  role="columnheader"
                  onClick={() => toggleDay(weekday)}
                  className="rounded-md py-1 text-center text-xs font-semibold text-ink transition-colors duration-(--dur-150) hover:bg-primary-50 hover:text-primary-dark"
                >
                  {copy.weekdaysShortLabel?.[weekday] ?? dictionary.admin.slots.create.weekdaysShort[weekday]}
                </button>
              ))}
            </div>
            {GRID_TIMES.map((time, row) => (
              <div key={time} role="row" className="grid grid-cols-[3.5rem_repeat(7,minmax(2.75rem,1fr))] gap-x-2 pb-1.5">
                <span role="rowheader" className={`tabular -mt-1.5 pr-1 text-right text-[10px] text-ink-muted ${row % 2 === 0 ? '' : 'invisible'}`}>
                  {time}
                </span>
                {WEEKDAY_ORDER.map((weekday, column) => {
                  const key = `${weekday}-${row}`;
                  const isOn = cells.has(key);
                  const isFocused = focusCell.column === column && focusCell.row === row;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="gridcell"
                      data-cell={key}
                      aria-selected={isOn}
                      aria-label={`${hoursCopy.weekdays[weekday]} ${time}`}
                      tabIndex={isFocused ? 0 : -1}
                      onFocus={() => setFocusCell({ column, row })}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        setFocusCell({ column, row });
                        startPaint(key);
                      }}
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse' && paintRef.current !== null) setCell(key, paintRef.current);
                      }}
                      className={`h-6 rounded-md border transition-colors duration-(--dur-100) focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${isOn ? 'border-primary bg-primary hover:bg-primary-bright' : 'border-line-strong/60 bg-card-dim hover:border-primary hover:bg-primary-50'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          {/* Clients will see: next 7 days */}
          <section aria-labelledby="preview-title" className="rounded-card border border-line bg-card p-4">
            <h3 id="preview-title" className="text-sm font-semibold text-ink">{copy.previewTitle}</h3>
            <ul className="mt-3 space-y-1.5">
              {preview.map(({ dateKey, count }) => (
                <li key={dateKey} className="flex items-center gap-2 text-sm">
                  <span className={`flex-1 ${dateKey === todayKey ? 'font-semibold text-primary-dark' : 'text-ink'}`}>{dayLabel(dateKey)}</span>
                  <motion.span
                    key={count}
                    initial={isReduced ? false : { scale: 0.85, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`tabular rounded-full px-2 py-0.5 text-[11px] font-semibold ${count > 0 ? 'bg-success-50 text-success' : 'bg-card-dim text-ink-muted'}`}
                  >
                    {count > 0 ? copy.previewTimes(count) : copy.previewClosed}
                  </motion.span>
                </li>
              ))}
            </ul>
          </section>

          {/* Days off */}
          <section aria-labelledby="days-off-title" className="rounded-card border border-line bg-card p-4">
            <div className="flex items-center gap-1.5">
              <h3 id="days-off-title" className="text-sm font-semibold text-ink">{copy.daysOff}</h3>
              <InfoTip>{copy.daysOffHint}</InfoTip>
            </div>
            <div className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField id="day-off-date" name="DayOff" type="date" label={copy.overrideDate} min={todayKey} value={newDayOff} onChange={(event) => setNewDayOff(event.target.value)} />
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={!newDayOff}
                onClick={() => {
                  setDaysOff((list) => (list.includes(newDayOff) ? list : [...list, newDayOff].sort()));
                  setNewDayOff('');
                }}
                className="mb-px h-12"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
                {copy.addDayOff}
              </Button>
            </div>
            {daysOff.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">{copy.noDaysOff}</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                <AnimatePresence initial={false}>
                  {daysOff.map((date) => (
                    <motion.li
                      key={date}
                      layout={!isReduced}
                      initial={isReduced ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-1 rounded-full bg-card-dim py-1 pl-3 pr-1 text-xs font-semibold text-ink"
                    >
                      {dayLabel(date)}
                      <button
                        type="button"
                        onClick={() => setDaysOff((list) => list.filter((item) => item !== date))}
                        aria-label={`${copy.removeOverride}: ${dayLabel(date)}`}
                        className={`${ICON_BUTTON_CLASS} size-6 hover:bg-danger/10 hover:text-danger`}
                      >
                        <X aria-hidden="true" className="size-3.5" strokeWidth={2} />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Booking provider: LexBridge Consultants slots or an embedded Calendly calendar
function BookingProviderPanel({ availability, isCalendlyReady, onSaved }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots.provider;
  const [provider, setProvider] = useState(availability.Provider ?? 'builtin');
  const [calendlyUrl, setCalendlyUrl] = useState(availability.CalendlyUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function save() {
    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi('/admin/availability', {
        method: 'PUT',
        body: {
          Weekly: availability.Weekly ?? [],
          Overrides: availability.Overrides ?? [],
          DurationMinutes: availability.DurationMinutes ?? 30,
          Capacity: availability.Capacity ?? 1,
          PublishWeeks: availability.PublishWeeks ?? 8,
          Provider: provider,
          CalendlyUrl: calendlyUrl.trim(),
        },
      });
      setMessage({ tone: 'success', text: copy.saved });
      onSaved();
    } catch (error) {
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPanel className="max-w-2xl">
      <div className="space-y-4">
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
          {[
            ['builtin', CalendarClock, copy.builtinTitle, copy.builtinBody],
            ['calendly', Link2, copy.calendlyTitle, copy.calendlyBody],
          ].map(([key, Icon, title, body]) => {
            const isChosen = provider === key;
            return (
              <label
                key={key}
                className={`flex cursor-pointer gap-3 rounded-card border p-4 transition-colors duration-(--dur-150) has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${isChosen ? 'border-primary bg-primary-50' : 'border-line hover:border-line-strong'}`}
              >
                <input type="radio" name="Provider" value={key} checked={isChosen} onChange={() => setProvider(key)} className="sr-only" />
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${isChosen ? 'bg-primary text-canvas' : 'bg-card-dim text-primary-dark'}`}>
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{title}</span>
                  <span className="mt-0.5 block text-sm leading-5 text-ink-muted">{body}</span>
                </span>
              </label>
            );
          })}
        </div>
        {provider === 'calendly' && (
          <>
            <TextField
              id="calendly-url"
              name="CalendlyUrl"
              type="url"
              label={copy.calendlyUrl}
              hint={copy.calendlyUrlHint}
              value={calendlyUrl}
              onChange={(event) => setCalendlyUrl(event.target.value)}
              placeholder="https://calendly.com/…"
            />
            <p className={`rounded-control px-3 py-2 text-sm ${isCalendlyReady ? 'bg-success-50 text-success' : 'bg-warning-50 text-warning'}`}>
              {isCalendlyReady ? copy.tokenReady : copy.tokenMissing}
            </p>
          </>
        )}
        <FormMessage message={message} />
        <Button isLoading={isSaving} onClick={save}>
          {copy.save}
        </Button>
      </div>
    </AdminPanel>
  );
}

/*
  Slots, three tabs (Cal.com / Calendly availability pattern): Weekly hours (the recurring schedule,
  published into slots), Calendar (the published week, for one-off removals) and Booking provider.
*/
export function AdminSlots() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.slots;
  const [tab, setTab] = useState('hours');
  const { data, error, isLoading, reload } = useApiData('/admin/availability');

  return (
    <div>
      <AdminPageHeading title={copy.title} />
      <div role="tablist" className="mb-4 flex gap-1 border-b border-line-canvas">
        {Object.entries(copy.tabs).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm font-semibold transition-colors duration-(--dur-150) ${tab === key ? 'border-primary text-on-canvas' : 'border-transparent text-on-canvas-muted hover:text-on-canvas'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'calendar' ? (
        // Remounts on every visit, so slots published a moment ago show straight away
        <SlotsCalendar />
      ) : isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : tab === 'hours' ? (
        <AvailabilityEditor key={data.availability.updatedAt ?? 'new'} availability={data.availability} onSaved={reload} />
      ) : (
        <BookingProviderPanel key={data.availability.updatedAt ?? 'new'} availability={data.availability} isCalendlyReady={data.isCalendlyReady} onSaved={reload} />
      )}
    </div>
  );
}
