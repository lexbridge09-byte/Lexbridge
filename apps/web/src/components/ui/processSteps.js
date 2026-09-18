// Horizontal numbered steps joined by a hairline on desktop; stacks on phones
export function ProcessSteps({ steps }) {
  const lastStepIndex = steps.length - 1;
  return (
    <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
      {steps.map((step, stepIndex) => (
        <li key={step.title} className="lg:pr-6">
          <div className="flex items-center gap-3">
            <span className="tabular flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {stepIndex + 1}
            </span>
            {stepIndex < lastStepIndex && <span aria-hidden="true" className="hidden h-px flex-1 bg-line lg:block" />}
          </div>
          <h3 className="mt-3 text-h4 text-ink">{step.title}</h3>
          <p className="mt-1 text-sm leading-6 text-ink-muted">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
