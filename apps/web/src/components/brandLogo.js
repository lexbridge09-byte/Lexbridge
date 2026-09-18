import { BRAND } from '@/brand';

export function BrandLogo({ tone = 'dark' }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-xl bg-cta font-display text-lg font-extrabold text-white shadow-glow"
      >
        {BRAND.name.charAt(0)}
      </span>
      <span className={`font-display text-xl font-extrabold tracking-tight ${tone === 'light' ? 'text-white' : 'text-ink'}`}>
        {BRAND.name}
      </span>
    </span>
  );
}
