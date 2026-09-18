import { getDictionary, requireFeaturePage } from '@/brand';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { Card, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).drafting.metadata;
}

export default async function DraftingPage({ params }) {
  requireFeaturePage('legalDrafting');
  const { lang } = await params;
  const { header, documentTypes, steps, request } = getDictionary(lang).drafting;
  // Stored subtype stays in English so the team sees one consistent value whatever language the client used
  const englishTypes = getDictionary('en').drafting.documentTypes.items;
  const subtypeOptions = documentTypes.items.map((documentType, typeIndex) => ({
    value: englishTypes[typeIndex].title,
    label: documentType.title,
    description: documentType.description,
    icon: documentType.icon,
  }));

  return (
    <>
      <PageHeader title={header.title} lead={header.lead} />

      {/* The whole request fits on one screen: a two-step form beside a short "how it works" */}
      <Section tone="alt" size="sm">
        <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr] lg:gap-8">
          <Card padding="lg" id="request">
            <h2 className="text-h3 text-ink">{request.title}</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">{request.note}</p>
            <ServiceRequestForm
              source="drafting-form"
              defaultCategory="legal-drafting"
              isCategoryLocked
              subtypeLabel={request.subtypeLabel}
              subtypeOptions={subtypeOptions}
              descriptionLabel={request.descriptionLabel}
              submitLabel={request.submitLabel}
            />
          </Card>

          <Card as="aside" padding="md" aria-labelledby="drafting-steps-title" className="lg:sticky lg:top-24">
            <h2 id="drafting-steps-title" className="text-h4 text-ink">
              {steps.title}
            </h2>
            <ol className="mt-4 space-y-4">
              {steps.items.map((step, stepIndex) => (
                <li key={step.title} className="flex gap-3">
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                    {stepIndex + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{step.title}</span>
                    <span className="block text-sm leading-5 text-ink-muted">{step.description}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </Section>
    </>
  );
}
