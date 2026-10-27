import { getDictionary, requireFeaturePage } from '@/brand';
import { ServiceRequestForm } from '@/components/serviceRequestForm';
import { FormSheet, RailCard, TaskPage } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).drafting.metadata;
}

export default async function DraftingPage({ params }) {
  await requireFeaturePage('legalDrafting');
  const { lang } = await params;
  const { header, documentTypes, steps, request } = getDictionary(lang).drafting;
  // Stored subtype stays in English so the team sees one consistent value whatever language the client used
  const englishTypes = getDictionary('en').drafting.documentTypes.items;
  // Subtype values are intake catalog keys so conditional questions and desk panels work;
  // old requests keep their free-text titles, which still display as-is.
  const subtypeKeys = ['legal-notice', 'agreement', 'affidavit', 'application', 'complaint', 'other-document'];
  const subtypeOptions = documentTypes.items.map((documentType, typeIndex) => ({
    value: subtypeKeys[typeIndex] ?? englishTypes[typeIndex].title,
    label: documentType.title,
    description: documentType.description,
    icon: documentType.icon,
  }));

  const rail = (
    <>
      <RailCard title={steps.title}>
        <ol className="space-y-3.5">
          {steps.items.map((step, stepIndex) => (
            <li key={step.title} className="flex gap-3">
              <span className="tabular font-brand text-xl font-bold leading-6 text-primary-bright">{String(stepIndex + 1).padStart(2, '0')}</span>
              <span>
                <span className="block font-semibold text-on-canvas">{step.title}</span>
                <span className="block text-xs leading-5">{step.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </RailCard>
      <RailCard title={documentTypes.title}>
        <p className="text-xs leading-5 text-on-canvas">{documentTypes.items.map((documentType) => documentType.title).join(' · ')}</p>
      </RailCard>
    </>
  );

  return (
    <TaskPage title={header.title} rail={rail}>
      <FormSheet id="request" title={request.title} note={request.note}>
        <ServiceRequestForm
          source="drafting-form"
          defaultCategory="legal-drafting"
          isCategoryLocked
          subtypeLabel={request.subtypeLabel}
          subtypeOptions={subtypeOptions}
          descriptionLabel={request.descriptionLabel}
          submitLabel={request.submitLabel}
        />
      </FormSheet>
    </TaskPage>
  );
}
