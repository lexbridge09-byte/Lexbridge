import { FieldError } from '@/components/formFields';
import { LocaleLink } from '@/components/localeLink';

// Dense back-office styles on the shared design tokens
export const ADMIN_CONTROL_CLASS =
  'block w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100';

export const ADMIN_LABEL_CLASS = 'block text-xs font-semibold text-ink-muted';

export const ADMIN_TABLE_CLASS = 'w-full min-w-[40rem] border-collapse text-left text-sm';
export const ADMIN_TH_CLASS = 'border-b border-line bg-surface-alt px-3 py-2.5 text-xs font-semibold text-ink-muted first:rounded-tl-xl last:rounded-tr-xl';
export const ADMIN_TD_CLASS = 'border-b border-line px-3 py-2.5 align-top text-ink';
export const ADMIN_LINK_CLASS = 'font-semibold text-primary underline-offset-4 hover:underline';

export function AdminPageHeading({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-h3 text-ink">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// White panel that holds tables and forms
export function AdminPanel({ as: Element = 'div', title, action, className = '', children, ...elementProps }) {
  return (
    <Element className={`rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5 ${className}`} {...elementProps}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-h4 text-ink">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </Element>
  );
}

export function AdminBackLink({ href, children }) {
  return (
    <LocaleLink href={href} className="text-sm font-semibold text-primary hover:underline">
      ← {children}
    </LocaleLink>
  );
}

// Label, control, hint and error for dense admin forms. The child control should use `id`.
export function AdminField({ id, label, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={ADMIN_LABEL_CLASS}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function AdminTable({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className={ADMIN_TABLE_CLASS}>{children}</table>
    </div>
  );
}
