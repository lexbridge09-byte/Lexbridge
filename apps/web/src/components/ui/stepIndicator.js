import { Check } from 'lucide-react';

// Compact "1 Details · 2 Pay · 3 Done" progress; `current` is 1-based
export function StepIndicator({ label, steps, current, className = '' }) {
  return (
    <ol aria-label={label} className={`flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm ${className}`}>
      {steps.map((step, stepIndex) => {
        const stepNumber = stepIndex + 1;
        const state = stepNumber < current ? 'done' : stepNumber === current ? 'current' : 'todo';
        return (
          <li key={step} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs ${state === 'done' ? 'bg-success text-white' : state === 'current' ? 'bg-cta text-white' : 'bg-white text-ink-muted ring-1 ring-line'}`}
            >
              {state === 'done' ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : stepNumber}
            </span>
            <span className={state === 'todo' ? 'text-ink-muted' : 'text-ink'}>{step}</span>
            {stepNumber < steps.length && <span aria-hidden="true" className="h-px w-5 bg-line-strong/50 sm:w-8" />}
          </li>
        );
      })}
    </ol>
  );
}
