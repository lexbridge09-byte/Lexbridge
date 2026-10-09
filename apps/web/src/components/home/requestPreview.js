import { BadgeCheck, Check, Lock, Video } from 'lucide-react';
import { Badge } from '@/components/ui';

// Decorative product preview built in HTML (no screenshot), hidden from assistive technology.
// Echoes the real dashboard: reference chip, status badge, progress steps, next-step facts.
export function RequestPreview({ mockup }) {
  const completedStepCount = mockup.steps.length - 1;

  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-md sm:block lg:mx-0 lg:justify-self-end">
      {/* Soft glow as a static radial gradient: no blur filter, which is costly on low-end phones */}
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(197_160_89/0.3),transparent)]" />
      <div className="rounded-panel bg-card p-5 text-ink shadow-float ring-1 ring-primary/25 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-muted">{mockup.title}</p>
          <Badge tone="active">{mockup.status}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-display text-xl font-bold">{mockup.category}</p>
          <code className="rounded-md bg-card-dim px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-ink-muted">{mockup.reference}</code>
        </div>

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
          <div className="rounded-xl bg-card-dim p-3">
            <p className="text-xs text-ink-muted">{mockup.nextLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Video className="size-4 text-primary" strokeWidth={2} />
              {mockup.nextValue}
            </p>
          </div>
          <div className="rounded-xl bg-card-dim p-3">
            <p className="text-xs text-ink-muted">{mockup.documentsLabel}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              <Lock className="size-4 text-primary" strokeWidth={2} />
              {mockup.documentsValue}
            </p>
          </div>
        </div>

        {/* Assigned strip lives inside the card so nothing hangs over the edges */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-ink">
          <BadgeCheck className="size-5 shrink-0 text-success" strokeWidth={2} />
          {mockup.assignedLabel}
        </div>
      </div>
    </div>
  );
}
