import { ChevronDown } from 'lucide-react';
import { Container } from '@/components/ui/section';

// Service workspaces are not marketing heroes: one title, one task, optional help.
export function TaskPage({ title, lead, children, isWide = false }) {
  return (
    <section className="bg-canvas-alt pb-10 lg:pb-14">
      <Container size={isWide ? 'site' : 'task'}>
        <header className="border-b border-line-canvas py-5 sm:py-7">
          <h1 className="max-w-3xl text-h3 text-on-canvas sm:text-h2">{title}</h1>
          {lead && <p className="mt-2 max-w-2xl text-base leading-7 text-on-canvas-muted">{lead}</p>}
        </header>
        <div className="min-w-0 pt-5 sm:pt-6">{children}</div>
      </Container>
    </section>
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
