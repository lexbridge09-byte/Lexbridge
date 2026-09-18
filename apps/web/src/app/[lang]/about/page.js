import { ShieldCheck } from 'lucide-react';
import { getDictionary, getPrimaryCta } from '@/brand';
import { ButtonLink, Card, FeatureTile, PageHeader, Section, SectionHeader } from '@/components/ui';
import { getIcon } from '@/lib/icons';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).about.metadata;
}

export default async function AboutPage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const copy = dictionary.about;
  const primaryCta = getPrimaryCta(dictionary);

  return (
    <>
      <PageHeader title={copy.header.title} lead={copy.header.lead} />

      <Section size="sm">
        <p className="max-w-3xl text-lg leading-8 text-ink">{copy.story}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[copy.mission, copy.vision].map((block) => (
            <Card key={block.title} padding="md">
              <h2 className="text-h4 text-ink">{block.title}</h2>
              <p className="mt-2 leading-7 text-ink-muted">{block.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tone="alt" labelledBy="beliefs-title" size="sm">
        <SectionHeader id="beliefs-title" title={copy.beliefs.title} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.beliefs.items.map((belief) => (
            <li key={belief.icon}>
              <FeatureTile icon={getIcon(belief.icon)} title={belief.title} description={belief.description} />
            </li>
          ))}
        </ul>
      </Section>

      <Section labelledBy="approach-title" size="sm">
        <Card padding="lg" className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary">
            <ShieldCheck aria-hidden="true" className="size-7" strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <h2 id="approach-title" className="text-h3 text-ink">
              {copy.approach.title}
            </h2>
            <p className="mt-2 leading-7 text-ink-muted">{copy.approach.body}</p>
          </div>
          <ButtonLink href={primaryCta.href} className="shrink-0">
            {primaryCta.label}
          </ButtonLink>
        </Card>
      </Section>
    </>
  );
}
