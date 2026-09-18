export function ValueStrip({ title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-5 rounded-panel border border-primary-100 bg-linear-to-r from-accent-50 to-primary-50 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        <p className="text-h4 text-ink">{title}</p>
        {description && <p className="mt-1 text-sm leading-6 text-ink-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
