import { BRAND } from '@/brand/brandConfig';

// Lockup: "LexBridge" in the brand serif with "CONSULTANTS" as small spaced capitals beneath
export function BrandLogo({ tone = 'dark', isCompact = false }) {
  const [primaryWord, ...restWords] = BRAND.name.split(' ');
  const secondaryWords = restWords.join(' ');
  return (
    <span className="flex items-center gap-2">
      {/* Decorative: the wordmark beside it carries the name */}
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVG, sized explicitly */}
      <img
        src="/brand/lexbridge-mark.svg"
        alt=""
        width={44}
        height={36}
        className={`${isCompact ? 'hidden sm:block' : 'block'} h-9 w-auto shrink-0`}
      />
      <span className="flex flex-col leading-none">
        <span className={`font-brand text-2xl font-bold leading-none tracking-wide ${tone === 'light' ? 'text-ink' : 'text-[#e7b596]'}`}>{primaryWord}</span>
        {secondaryWords && (
          <span className={`mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-[0.42em] ${tone === 'light' ? 'text-ink-muted' : 'text-[#c88f6c]'}`}>
            {secondaryWords}
          </span>
        )}
      </span>
    </span>
  );
}
