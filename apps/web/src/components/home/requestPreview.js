import { BadgeCheck, Check, Lock, Video } from 'lucide-react';
import { Badge } from '@/components/ui';

// Decorative product preview built in HTML (no screenshot), hidden from assistive technology
export function RequestPreview({ mockup }) {
  const completedStepCount = mockup.steps.length - 1;

  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-md sm:block lg:mx-0 lg:justify-self-end">
      {/* Soft glow as a static radial gradient: no blur filter, which is costly on low-end phones */}
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(216_52_79/0.28),transparent)]" />
      <div className="rounded-panel bg-white p-5 text-ink shadow-float sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-muted">{mockup.title}</p>
          <Badge tone="active">{mockup.status}</Badge>
        </div>
        <p className="mt-1 font-display text-xl font-bold">{mockup.category}</p>

        <ol className="mt-5 space-y-3">
          {mockup.steps.map((step, stepIndex) => {
            const isDone = stepIndex < completedStepCount;
            return (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isDone ? 'bg-success text-white' : 'bg-primary-50 text-primary ring-2 ring-primary-100'}`}
                >
                  {isDone ? <Check className="size-3.5" strokeWidth={3} /> : <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className={isDone ? 'text-ink-muted' : 'font-semibold text-ink'}>{step}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-alt p-3">
            <p className="text-xs text-ink-muted">{mockup.nextLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Video className="size-4 text-primary" strokeWidth={2} />
              {mockup.nextValue}
            </p>
          </div>
          <div className="rounded-xl bg-surface-alt p-3">
            <p className="text-xs text-ink-muted">{mockup.documentsLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="size-4 text-primary" strokeWidth={2} />
              {mockup.documentsValue}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative extra: a single 300ms fade after load, never looping */}
      <div className="absolute -bottom-5 -left-3 hidden items-center gap-2 rounded-control bg-white px-4 py-3 text-sm font-semibold text-ink shadow-raised [animation-delay:400ms] motion-safe:animate-fade-in sm:flex">
        <BadgeCheck className="size-5 text-success" strokeWidth={2} />
        {mockup.assignedLabel}
      </div>
    </div>
  );
}
