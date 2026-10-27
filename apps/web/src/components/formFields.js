import { CircleAlert } from 'lucide-react';
import { InfoTip } from '@/components/infoTip';
import { SelectMenu } from '@/components/selectMenu';

// Visual states (hover, focus ring, error, disabled, custom select chevron) live in globals.css (.control)
const CONTROL_CLASS = 'control mt-1.5';

// Multi-step form actions stay pinned at the bottom of the viewport so Continue/Back never need a scroll.
// Tool pages hide the mobile tab bar, so the bar sits flush at the bottom. On short viewports (zoomed in, small laptops) a pinned bar would cover
// the fields, so there it sits in the normal flow at the end of the step instead.
export const STICKY_FORM_ACTIONS_CLASS =
  'sticky bottom-0 z-10 -mx-5 border-t border-line bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:-mx-7 sm:px-7 [@media(max-height:640px)]:static [@media(max-height:640px)]:border-t-0';

// Bring the top of a form back into view when its step changes (only if it has scrolled off)
export function revealFormTop(element) {
  if (!element) return;
  const top = element.getBoundingClientRect().top;
  if (top < 80) element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
const LABEL_CLASS = 'block text-sm font-semibold text-ink';

// Label with an optional "?" tip: hints stay out of the layout until asked for
function FieldLabel({ htmlFor, label, hint, hintId }) {
  return (
    <span className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {hint && <InfoTip id={hintId}>{hint}</InfoTip>}
    </span>
  );
}

function deriveDescribedBy(hintId, errorId, error) {
  return [hintId, error ? errorId : null].filter(Boolean).join(' ') || undefined;
}

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

// `prefix` shows fixed text or an icon inside the field (e.g. "+91", "₹"); `id` defaults to `name`
export function TextField({ id, label, name, error, hint, prefix, className = '', inputClassName = '', ...inputProps }) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const input = (
    <input
      id={fieldId}
      name={name}
      aria-invalid={Boolean(error)}
      aria-describedby={deriveDescribedBy(hintId, errorId, error)}
      className={`${CONTROL_CLASS} ${prefix ? 'pl-12' : ''} ${inputClassName}`}
      {...inputProps}
    />
  );
  return (
    <div className={`min-w-0 ${className}`}>
      <FieldLabel htmlFor={fieldId} label={label} hint={hint} hintId={hintId} />
      {prefix ? (
        <div className="relative">
          {input}
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 mt-1.5 flex w-11 items-center justify-center border-r border-line text-sm font-semibold text-ink-muted">
            {prefix}
          </span>
        </div>
      ) : (
        input
      )}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function TextAreaField({ id, label, name, error, hint, className = '', ...textAreaProps }) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <FieldLabel htmlFor={fieldId} label={label} hint={hint} hintId={hintId} />
      <textarea
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={deriveDescribedBy(hintId, errorId, error)}
        className={`${CONTROL_CLASS} leading-relaxed`}
        {...textAreaProps}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

// Styled dropdown (SelectMenu) with the same props as a native <select>
export function SelectField({ id, label, name, error, options, placeholder, className = '', value, defaultValue, onChange, disabled, required }) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const labelId = `${fieldId}-label`;
  return (
    <div className={`min-w-0 ${className}`}>
      <label id={labelId} htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
      </label>
      <SelectMenu
        id={fieldId}
        name={name}
        labelId={labelId}
        options={options}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        required={required}
        invalid={Boolean(error)}
        describedBy={error ? errorId : undefined}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

// Custom-drawn checkbox (.check) with a full-row tap target
export function CheckboxField({ id, name, error, className = '', children, ...inputProps }) {
  const errorId = `${id ?? name}-error`;
  return (
    <div className={`min-w-0 ${className}`}>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-2 text-sm leading-6 text-ink-muted">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="check mt-[3px]"
          {...inputProps}
        />
        <span className="min-w-0 break-words">{children}</span>
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
