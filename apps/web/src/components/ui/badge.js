const TONE_CLASSES = {
  neutral: 'bg-surface-alt text-ink-muted ring-line',
  active: 'bg-primary-50 text-primary-dark ring-primary-100',
  attention: 'bg-warning-50 text-warning ring-warning/25',
  done: 'bg-success-50 text-success ring-success/25',
  danger: 'bg-danger-50 text-danger ring-danger/25',
  offer: 'bg-accent text-primary-deep ring-accent',
};

export function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONE_CLASSES[tone] ?? TONE_CLASSES.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
