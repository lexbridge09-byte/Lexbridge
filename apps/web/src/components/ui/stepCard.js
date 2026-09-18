export function StepList({ steps, columnsClassName = 'md:grid-cols-3' }) {
  return (
    <ol className={`grid gap-4 lg:gap-5 ${columnsClassName}`}>
      {steps.map((step, stepIndex) => (
        <StepCard key={step.title} number={stepIndex + 1} title={step.title} description={step.description} />
      ))}
    </ol>
  );
}

export function StepCard({ number, title, description }) {
  return (
    <li className="rounded-2xl border border-line bg-linear-to-b from-white to-surface-alt p-6">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-[11px] bg-cta text-[15px] font-bold text-white"
      >
        {number}
      </span>
      <h3 className="mt-4 text-h4 text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>
    </li>
  );
}
