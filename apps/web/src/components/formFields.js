import { CircleAlert } from 'lucide-react';

// Visual states (hover, focus ring, error, disabled, custom select chevron) live in globals.css (.control)
const CONTROL_CLASS = 'control mt-1.5';
const LABEL_CLASS = 'block text-sm font-semibold text-ink';
const HINT_CLASS = 'mt-0.5 text-sm text-ink-muted';

function deriveDescribedBy(hintId, errorId, error) {
  return [hintId, error ? errorId : null].filter(Boolean).join(' ') || undefined;
}

export function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <span>{message}</span>
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
    <div className={className}>
      <label htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      )}
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
    <div className={className}>
      <label htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={HINT_CLASS}>
          {hint}
        </p>
      )}
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

export function SelectField({ id, label, name, error, options, placeholder, className = '', ...selectProps }) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={fieldId}
        name={name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={CONTROL_CLASS}
        {...selectProps}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

// Custom-drawn checkbox (.check) with a full-row tap target
export function CheckboxField({ id, name, error, className = '', children, ...inputProps }) {
  const errorId = `${id ?? name}-error`;
  return (
    <div className={className}>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1 text-sm leading-6 text-ink-muted">
        <input
          id={id}
          type="checkbox"
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="check mt-[3px]"
          {...inputProps}
        />
        <span>{children}</span>
      </label>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
