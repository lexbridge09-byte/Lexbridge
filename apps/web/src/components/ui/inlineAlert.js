import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

const TONE_STYLES = {
  info: { box: 'border-primary-100 bg-primary-50', icon: 'text-primary', Icon: Info },
  success: { box: 'border-success/25 bg-success-50', icon: 'text-success', Icon: CircleCheck },
  warning: { box: 'border-warning/25 bg-warning-50', icon: 'text-warning', Icon: TriangleAlert },
  error: { box: 'border-danger/25 bg-danger-50', icon: 'text-danger', Icon: CircleAlert },
};

export function InlineAlert({ tone = 'info', title, role, className = '', children }) {
  const style = TONE_STYLES[tone] ?? TONE_STYLES.info;
  const { Icon } = style;
  return (
    <div
      role={role ?? (tone === 'error' ? 'alert' : undefined)}
      className={`flex gap-3 rounded-xl border px-4 py-3 text-sm leading-6 text-ink ${style.box} ${className}`}
    >
      <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${style.icon}`} strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}
