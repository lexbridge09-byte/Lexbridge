import { StepsTimeline } from '@/components/home/stepsTimeline';
import { Reveal, Section } from '@/components/ui';

// A numbered timeline (not another card grid) with a short value note beside it
export function HowItWorks({ copy }) {
  return (
    <Section id="how-it-works" tone="alt" labelledBy="steps-title">
      <Reveal className="grid gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-16">
        <div>
          <h2 id="steps-title" className="text-section text-on-canvas">
            {copy.title}
          </h2>
          <p className="mt-2 leading-7 text-on-canvas-muted">{copy.description}</p>
          <div className="mt-6 rounded-card border border-primary-100 bg-primary-50 p-5">
            <p className="text-h4 text-primary-dark">{copy.value.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.value.description}</p>
          </div>
        </div>

        <StepsTimeline items={copy.items} />
      </Reveal>
    </Section>
  );
}
