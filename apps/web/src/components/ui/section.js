export function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-site px-4 sm:px-6 ${className}`}>{children}</div>;
}

const TONE_CLASSES = {
  plain: 'bg-white',
  alt: 'bg-surface-alt',
  tint: 'bg-primary-50',
};

// Tight vertical rhythm: about 40px on phones and 56px on desktop, less for `sm`
export function Section({ id, tone = 'plain', size = 'md', labelledBy, className = '', children }) {
  const paddingClass = size === 'sm' ? 'py-8 lg:py-12' : 'py-10 lg:py-14';
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
        <Heading id={id} className="text-section text-ink">
          {title}
        </Heading>
        {description && <p className="mt-2 text-base leading-7 text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
