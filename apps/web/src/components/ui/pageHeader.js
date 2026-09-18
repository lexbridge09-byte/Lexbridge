import { Container } from '@/components/ui/section';

// Compact dark band for inner pages: the page's own action should stay above the fold
export function PageHeader({ title, lead, eyebrow, actions, children }) {
  return (
    <section className="relative isolate overflow-hidden bg-hero text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-grid-lines [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
      />
      <Container className="py-7 lg:py-10">
        {eyebrow && <div className="mb-2 text-sm text-white/85">{eyebrow}</div>}
        <h1 className="max-w-3xl text-h2">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-base leading-7 text-white/90 lg:text-lg">{lead}</p>}
        {children && <div className="mt-2 max-w-2xl leading-7 text-white/80">{children}</div>}
        {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
      </Container>
    </section>
  );
}
