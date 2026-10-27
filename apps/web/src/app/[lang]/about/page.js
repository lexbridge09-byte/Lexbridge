import { ArrowRight, ShieldCheck } from 'lucide-react';
import { getDictionary, getPrimaryCta, getServerFeatures } from '@/brand';
import { ButtonLink, Container, Reveal, Section, SectionHeader, Stagger, StaggerItem } from '@/components/ui';
import { getIcon } from '@/lib/icons';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return getDictionary(lang).about.metadata;
}

// Editorial about page: a large serif statement, mission/vision as numbered columns,
// beliefs as a tile grid, and how professionals are assigned as the closing band.
export default async function AboutPage({ params }) {
  const { lang } = await params;
  const dictionary = getDictionary(lang);
  const features = await getServerFeatures();
  const copy = dictionary.about;
  const primaryCta = getPrimaryCta(dictionary, features);

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line-canvas bg-hero">
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-grid-lines [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        {/* The brand mark, oversized and faint, anchors the page */}
        <img
          src="/brand/lexbridge-mark.svg"
          alt=""
          aria-hidden="true"
          width={480}
          height={392}
          className="pointer-events-none absolute -right-16 top-1/2 -z-10 hidden w-[30rem] -translate-y-1/2 opacity-[0.07] lg:block"
        />
        <Container className="py-12 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-bright">{copy.header.title}</p>
          <h1 className="mt-4 max-w-4xl font-heading text-4xl font-bold leading-[1.1] text-on-canvas sm:text-5xl lg:text-6xl">{copy.story}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-on-canvas-muted lg:text-lg">{copy.header.lead}</p>
        </Container>
      </section>

      <Section labelledBy="mission-title">
        <h2 id="mission-title" className="sr-only">
          {copy.mission.title}
        </h2>
        <Stagger as="div" gap={0.1} className="grid gap-8 md:grid-cols-2 md:gap-12">
          {[copy.mission, copy.vision].map((block, blockIndex) => (
            <StaggerItem as="div" key={block.title} className="relative border-t border-line-canvas pt-6">
              <span aria-hidden="true" className="absolute -top-px left-0 h-px w-16 bg-primary" />
              <p className="flex items-baseline gap-3">
                <span className="tabular font-brand text-4xl font-bold leading-none text-primary-bright">{String(blockIndex + 1).padStart(2, '0')}</span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-on-canvas-subtle">{block.title}</span>
              </p>
              <p className="mt-4 font-heading text-2xl font-bold leading-snug text-on-canvas lg:text-3xl">{block.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </Section>

      <Section tone="alt" labelledBy="beliefs-title">
        <SectionHeader id="beliefs-title" title={copy.beliefs.title} />
        <Stagger gap={0.07} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.beliefs.items.map((belief) => {
            const Icon = getIcon(belief.icon);
            return (
              <StaggerItem
                key={belief.icon}
                className="group rounded-panel border border-line-canvas bg-canvas p-6 transition-[transform,border-color,box-shadow] duration-(--dur-300) ease-(--ease-out-soft) hover:-translate-y-1 hover:border-primary/45 hover:shadow-float motion-reduce:hover:translate-y-0"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-bright ring-1 ring-primary/30 transition-transform duration-(--dur-300) ease-(--ease-out-soft) group-hover:-rotate-6 group-hover:scale-110 motion-reduce:transition-none">
                  <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 font-heading text-2xl font-bold text-on-canvas">{belief.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-on-canvas-muted">{belief.description}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </Section>

      <Container className="py-10 lg:py-12">
        <Reveal className="relative overflow-hidden rounded-panel border border-primary/25 bg-hero p-6 sm:p-8 lg:flex lg:items-center lg:gap-10 lg:p-10">
          <div aria-hidden="true" className="absolute -left-16 -top-20 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(200_143_108/0.25),transparent)]" />
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary-bright ring-1 ring-primary/30">
            <ShieldCheck aria-hidden="true" className="size-7" strokeWidth={1.75} />
          </span>
          <div className="mt-5 flex-1 lg:mt-0">
            <h2 className="text-section text-on-canvas">{copy.approach.title}</h2>
            <p className="mt-2 max-w-2xl leading-7 text-on-canvas-muted">{copy.approach.body}</p>
          </div>
          <ButtonLink href={primaryCta.href} size="lg" className="group mt-6 shrink-0 lg:mt-0">
            {primaryCta.label}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-(--dur-150) group-hover:translate-x-1 motion-reduce:transition-none" strokeWidth={2} />
          </ButtonLink>
        </Reveal>
      </Container>
    </>
  );
}
