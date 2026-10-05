import { LoaderCircle } from 'lucide-react';
import { LocaleLink } from '@/components/localeLink';

const VARIANT_CLASSES = {
  // The only gradient in the system: one per view, for the action people should take next.
  // Charcoal text on bronze: bronze + white fails AA at button sizes.
  primary: 'bg-cta font-bold text-canvas shadow-glow hover:brightness-110 active:brightness-95',
  secondary: 'border border-primary-dark bg-card text-primary-dark hover:bg-primary-50',
  outline: 'border border-line-strong bg-card text-ink hover:border-ink hover:bg-card-hover',
  ghost: 'text-ink hover:bg-card-hover',
  ghostOnDark: 'border border-white/70 text-white hover:border-white hover:bg-white/10',
  onDark: 'bg-card text-ink shadow-hairline hover:bg-primary-50',
  onDarkBronze: 'border border-primary/60 text-primary hover:border-primary hover:bg-primary/10',
  danger: 'bg-danger text-white hover:brightness-110',
  link: 'text-primary-dark underline-offset-4 hover:underline',
  linkOnDark: 'text-primary-bright underline-offset-4 hover:underline',
};

// sm 36px, md 44px, lg 52px
const SIZE_CLASSES = {
  sm: 'min-h-9 rounded-control px-4 py-2 text-sm',
  md: 'min-h-11 rounded-control px-5 py-2.5 text-[15px] leading-5',
  lg: 'min-h-13 rounded-card px-7 py-3.5 text-[15px] leading-5',
};

export function buttonClassName({ variant = 'primary', size = 'md', isFullWidth = false, className = '' } = {}) {
  return [
    'inline-flex select-none items-center justify-center gap-2 text-center font-semibold',
    'transition-[background-color,border-color,color,box-shadow,filter,transform] duration-(--dur-150) ease-(--ease-standard)',
    variant === 'link' ? '' : 'active:scale-(--press-scale)',
    'disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55',
    'motion-reduce:transition-none motion-reduce:active:scale-100',
    VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.primary,
    variant === 'link' ? '' : SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
    isFullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

// `isLoading` keeps the label in place (so the width doesn't jump) and overlays a spinner
export function Button({ variant, size, isFullWidth, className, type = 'button', isLoading = false, disabled, children, ...buttonProps }) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={buttonClassName({ variant, size, isFullWidth, className: `${isLoading ? 'relative' : ''} ${className ?? ''}` })}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <span className="invisible inline-flex items-center gap-2">{children}</span>
          <LoaderCircle aria-hidden="true" className="absolute size-5 animate-spin motion-reduce:animate-none" strokeWidth={2} />
        </>
      ) : (
        children
      )}
    </button>
  );
}

// Internal paths get the current locale; `isExternal` opens a new tab; hash-only links stay plain anchors
export function ButtonLink({ href, variant, size, isFullWidth, className, isExternal = false, ...linkProps }) {
  const linkClassName = buttonClassName({ variant, size, isFullWidth, className });
  if (isExternal) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName} {...linkProps} />;
  }
  if (href.startsWith('#')) {
    return <a href={href} className={linkClassName} {...linkProps} />;
  }
  return <LocaleLink href={href} className={linkClassName} {...linkProps} />;
}
