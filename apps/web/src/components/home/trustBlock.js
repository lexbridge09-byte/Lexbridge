import { LocaleLink } from '@/components/localeLink';
import { ButtonLink, Section } from '@/components/ui';
import { getIcon } from '@/lib/icons';

// Honest reasons to trust the service (no numbers we can't back up) and a human route for people who want to talk first
export function TrustBlock({ copy, contactLabel }) {
  return (
    <Section tone="alt" labelledBy="trust-title">
      <div className="reveal grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        <div>
          <h2 id="trust-title" className="text-section text-ink">
            {copy.title}
          </h2>
          <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {copy.items.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <div key={item.title} className="flex gap-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-white text-primary ring-1 ring-line">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <dt className="font-display text-[15px] font-semibold text-ink">{item.title}</dt>
                    <dd className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</dd>
                  </div>
                </div>
              );
            })}
          </dl>
          <LocaleLink
            href="/legal/refund-cancellation"
            className="mt-6 inline-flex text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors duration-(--dur-150) hover:decoration-primary"
          >
            {copy.refundLink}
          </LocaleLink>
        </div>

        <aside className="self-start rounded-panel border border-line bg-white p-6 shadow-card">
          <h3 className="text-h4 text-ink">{copy.contactTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.contactBody}</p>
          <ButtonLink href="/contact" variant="secondary" isFullWidth className="mt-4">
            {contactLabel}
          </ButtonLink>
        </aside>
      </div>
    </Section>
  );
}
