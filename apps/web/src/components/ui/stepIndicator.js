import { Check } from 'lucide-react';

// Compact "1 Details · 2 Pay · 3 Done" progress; `current` is 1-based
export function StepIndicator({ label, steps, current, surface = 'dark', className = '' }) {
  const isLight = surface === 'light';
  return (
    <ol aria-label={label} className={`flex flex-wrap items-center gap-2 text-xs font-semibold sm:text-sm ${className}`}>
      {steps.map((step, stepIndex) => {
        const stepNumber = stepIndex + 1;
        const state = stepNumber < current ? 'done' : stepNumber === current ? 'current' : 'todo';
        return (
          <li key={step} aria-current={state === 'current' ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs ${state === 'done' ? 'bg-success text-white' : state === 'current' ? 'bg-cta text-canvas' : 'bg-canvas-alt text-on-canvas-muted ring-1 ring-line-canvas'}`}
            >
              {state === 'done' ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : stepNumber}
            </span>
            <span className={isLight ? (state === 'todo' ? 'text-ink-muted' : 'text-ink') : (state === 'todo' ? 'text-on-canvas-muted' : 'text-on-canvas')}>{step}</span>
            {stepNumber < steps.length && <span aria-hidden="true" className={`h-px w-5 sm:w-8 ${isLight ? 'bg-line-strong' : 'bg-line-canvas'}`} />}
          </li>
        );
      })}
    </ol>
  );
}
