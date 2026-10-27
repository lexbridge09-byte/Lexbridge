import { ChevronDown } from 'lucide-react';
import { InfoTip } from '@/components/infoTip';
import { Container } from '@/components/ui/section';

/*
  Tool pages are app screens, not marketing pages: the working surface starts right under the site
  header, with an optional `rail` beside it for help. No heroes, no title bars, no "how it works" sections.
*/
// Always the wide container: a narrow centred column leaves the sides of large screens empty
export function TaskPage({ title, children, rail }) {
  const hasRail = Boolean(rail);
  return (
    <section className="pb-10 pt-6 sm:pt-8 lg:pb-14">
      {/* The site header already says where you are; the visible title bar only cost space */}
      <h1 className="sr-only">{title}</h1>
      <Container size="wide">
        {hasRail ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
            <div className="min-w-0">{children}</div>
            <aside className="space-y-4 lg:sticky lg:top-24">{rail}</aside>
          </div>
        ) : (
          <div className="min-w-0">{children}</div>
        )}
      </Container>
    </section>
  );
}

// Compact rail card: a short title over a few lines of supporting help; `tip` adds a "?" beside the title
export function RailCard({ title, tip, children, className = '' }) {
  return (
    <div className={`rounded-panel border border-line-canvas bg-canvas-alt p-5 ${className}`}>
      {title && (
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-on-canvas">{title}</h2>
          {tip && <InfoTip tone="dark">{tip}</InfoTip>}
        </div>
      )}
      <div className={`text-sm leading-6 text-on-canvas-muted ${title ? 'mt-3' : ''}`}>{children}</div>
    </div>
  );
}

// Essential constraints stay visible beside the task. Only supplementary help belongs here.
export function TaskHelp({ title, children }) {
  return (
    <details className="group mt-6 border-t border-line-canvas">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-4 text-sm font-semibold text-on-canvas [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-primary transition-transform duration-(--dur-150) group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="space-y-4 pb-4 text-sm leading-6 text-on-canvas-muted">{children}</div>
    </details>
  );
}
