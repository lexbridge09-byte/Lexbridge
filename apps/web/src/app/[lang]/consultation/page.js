import { getDictionary, getFaqItems, requireFeaturePage } from '@/brand';
import { ConsultationBooking } from '@/components/consultationBooking';
import { ButtonLink, FaqAccordion, PageHeader, ProcessSteps, Section, SectionHeader } from '@/components/ui';
import { getIcon } from '@/lib/icons';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).consultation.metadata;
}

export default async function ConsultationPage({ params }) {
  requireFeaturePage('consultationBooking');
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.consultation;
  const faqItems = getFaqItems(dictionary, lang, { ids: copy.faq.ids });

  return (
    <>
      <PageHeader title={copy.header.title} lead={copy.header.lead} />

      {/* The booking form is the page's one job, so it comes first */}
      <Section tone="alt" size="sm">
        <ConsultationBooking />
      </Section>

      <Section labelledBy="consultation-steps-title">
        <SectionHeader id="consultation-steps-title" title={copy.steps.title} />
        <ProcessSteps steps={copy.steps.items} />
      </Section>

      <Section tone="alt" labelledBy="consultation-advantages-title" size="sm">
        <SectionHeader id="consultation-advantages-title" title={copy.advantages.title} />
        <ul className="reveal grid gap-4 sm:grid-cols-3">
          {copy.advantages.items.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <li key={item.title} className="rounded-card border border-line bg-white p-5">
                <span className="flex size-10 items-center justify-center rounded-control bg-primary-50 text-primary">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 font-display text-[15px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {faqItems.length > 0 && (
        <Section labelledBy="consultation-faq-title" size="sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
            <div>
              <h2 id="consultation-faq-title" className="text-section text-ink">
                {copy.faq.title}
              </h2>
              <ButtonLink href="/faq" variant="link" className="mt-2">
                {dictionary.home.faq.viewAll}
              </ButtonLink>
            </div>
            <FaqAccordion items={faqItems} />
          </div>
        </Section>
      )}
    </>
  );
}
