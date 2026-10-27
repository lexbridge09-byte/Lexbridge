import { InfoTip } from '@/components/infoTip';

export function Container({ className = '', size = 'site', children }) {
  return <div className={`mx-auto w-full min-w-0 ${size === 'task' ? 'max-w-5xl' : size === 'wide' ? 'max-w-[88rem]' : size === 'full' ? 'max-w-none' : 'max-w-site'} px-4 sm:px-6 ${className}`}>{children}</div>;
}

const TONE_CLASSES = {
  plain: 'bg-transparent',
  alt: 'border-y border-line-canvas/70 bg-canvas-alt',
  tint: 'border-y border-line-canvas/70 bg-canvas-alt',
};

// Tight vertical rhythm: 40px on phones and 48px on desktop, less for `sm`
export function Section({ id, tone = 'plain', size = 'md', labelledBy, className = '', children }) {
  const paddingClass = size === 'sm' ? 'py-8 lg:py-10' : 'py-10 lg:py-12';
  return (
    <section id={id} aria-labelledby={labelledBy} className={`${TONE_CLASSES[tone] ?? TONE_CLASSES.plain} ${paddingClass} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({ id, title, description, align = 'left', action, as: Heading = 'h2' }) {
  const isCentered = align === 'center';
  return (
    <div className={`mb-5 flex gap-3 lg:mb-6 ${isCentered ? 'flex-col items-center text-center' : 'flex-wrap items-end justify-between'}`}>
      <div className="max-w-2xl">
        {/* Supporting line lives in a "?" tip so the heading stays short */}
        <div className="flex items-center gap-2">
          <Heading id={id} className="text-section text-on-canvas">
            {title}
          </Heading>
          {description && <InfoTip tone="dark">{description}</InfoTip>}
        </div>
      </div>
      {action}
    </div>
  );
}
