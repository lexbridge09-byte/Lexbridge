import { getDictionary, getFaqItems, getPrimaryCta, getServerFeatures } from '@/brand';
import { ButtonLink, FaqAccordion, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).faq.metadata;
}

export default async function FaqPage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const primaryCta = getPrimaryCta(dictionary, features);

  return (
    <>
      <PageHeader
        title={dictionary.faq.header.title}
        lead={dictionary.faq.header.lead}
        actions={
          <ButtonLink href={primaryCta.href} variant="onDark">
            {primaryCta.label}
          </ButtonLink>
        }
      />
      <Section tone="alt" size="sm">
        <div className="mx-auto max-w-3xl">
          <FaqAccordion items={getFaqItems(dictionary, lang, features)} />
        </div>
      </Section>
    </>
  );
}
