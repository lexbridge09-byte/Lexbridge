import { InfoTip } from '@/components/infoTip';
import { Container } from './section.js';

// Shared inner-page top: no visible title block (the site header already says where you are).
// The heading stays for screen readers; only the page's tools (`aside`, `children`) show, in a slim bar.
export function PageHero({ title, aside, children }) {
  const hasTools = Boolean(aside || children);
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      {hasTools && (
        <div className="border-b border-line-canvas bg-canvas-alt">
          <Container className="py-4">
            {aside && <div className="max-w-2xl">{aside}</div>}
            {children}
          </Container>
        </div>
      )}
    </>
  );
}

// Light sheet for forms on the dark canvas (shared form fields are built for light surfaces)
export function FormSheet({ title, note, id, className = '', children }) {
  // No overflow-hidden (and so no edge decoration): clipping would break the sticky action bar in multi-step forms
  return (
    <section id={id} className={`relative rounded-panel bg-card p-5 text-ink shadow-float sm:p-7 ${className}`}>
      {title && (
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-2xl font-bold leading-tight text-ink sm:text-3xl">{title}</h2>
          {note && <InfoTip>{note}</InfoTip>}
        </div>
      )}
      <div className={title ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}
