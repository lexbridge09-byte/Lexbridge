import { getDictionary, getFaqItems, getServerFeatures } from '@/brand';
import { FaqCenter } from '@/components/faqCenter';
import { Container, PageHero, Reveal } from '@/components/ui';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).faq.metadata;
}

export default async function FaqPage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const faq = dictionary.faq;

  return (
    <>
      <PageHero title={faq.header.title} />

      <Container className="py-8 lg:py-10">
        <Reveal>
          <FaqCenter items={getFaqItems(dictionary, lang, features)} copy={faq.center} />
        </Reveal>
      </Container>
    </>
  );
}
