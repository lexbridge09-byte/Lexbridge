import { LocaleLink } from '@/components/localeLink';
import { ButtonLink, Reveal, Section, Stagger, StaggerItem } from '@/components/ui';
import { getIcon } from '@/lib/icons';

// Honest reasons to trust the service (no numbers we can't back up) and a human route for people who want to talk first
export function TrustBlock({ copy, contactLabel }) {
  return (
    <Section tone="alt" labelledBy="trust-title">
      <Reveal className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        <div>
          <h2 id="trust-title" className="text-section text-on-canvas">
            {copy.title}
          </h2>
          <Stagger as="dl" gap={0.08} className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {copy.items.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <StaggerItem as="div" key={item.title} className="group flex gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-primary/15 text-primary-bright ring-1 ring-primary/30 transition-[transform,background-color] duration-(--dur-200) ease-(--ease-out-soft) group-hover:-rotate-6 group-hover:scale-110 group-hover:bg-primary/25 motion-reduce:transition-none">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <dt className="font-display text-[15px] font-semibold text-on-canvas">{item.title}</dt>
                    <dd className="mt-1 text-sm leading-6 text-on-canvas-muted">{item.description}</dd>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
          <LocaleLink
            href="/legal/refund-cancellation"
            className="mt-6 inline-flex text-sm font-semibold text-primary-bright underline decoration-primary/40 underline-offset-4 transition-colors duration-(--dur-150) hover:decoration-primary"
          >
            {copy.refundLink}
          </LocaleLink>
        </div>

        <aside className="lift self-start rounded-panel border border-line bg-card p-6 shadow-card">
          <h3 className="text-h4 text-ink">{copy.contactTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.contactBody}</p>
          <ButtonLink href="/contact" variant="secondary" isFullWidth className="mt-4">
            {contactLabel}
          </ButtonLink>
        </aside>
      </Reveal>
    </Section>
  );
}
