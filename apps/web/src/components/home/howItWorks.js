import { Section } from '@/components/ui';

// A numbered timeline (not another card grid) with a short value note beside it
export function HowItWorks({ copy }) {
  return (
    <Section id="how-it-works" labelledBy="steps-title">
      <div className="reveal grid gap-8 lg:grid-cols-[0.9fr_1.5fr] lg:gap-16">
        <div>
          <h2 id="steps-title" className="text-section text-ink">
            {copy.title}
          </h2>
          <p className="mt-2 leading-7 text-ink-muted">{copy.description}</p>
          <div className="mt-6 rounded-card border border-primary-100 bg-primary-50 p-5">
            <p className="text-h4 text-primary-dark">{copy.value.title}</p>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{copy.value.description}</p>
          </div>
        </div>

        <ol className="relative space-y-7 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-px before:bg-line">
          {copy.items.map((step, stepIndex) => (
            <li key={step.title} className="relative flex gap-4">
              <span className="tabular relative flex size-10 shrink-0 items-center justify-center rounded-full border border-primary-100 bg-white font-display text-[15px] font-bold text-primary shadow-hairline">
                {stepIndex + 1}
              </span>
              <div className="pt-1.5">
                <h3 className="text-h4 text-ink">{step.title}</h3>
                <p className="mt-1 max-w-md text-sm leading-6 text-ink-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
