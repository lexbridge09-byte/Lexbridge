'use client';

import { BadgeCheck, Check, Lock, Video } from 'lucide-react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { Badge } from '@/components/ui';

const TILT_SPRING = { stiffness: 150, damping: 18, mass: 0.6 };

// Decorative product preview built in HTML (no screenshot), hidden from assistive technology.
// Echoes the real dashboard: reference chip, status badge, progress steps, next-step facts.
// Motion is transform/opacity only, so the card never moves the layout around it.
export function RequestPreview({ mockup }) {
  const completedStepCount = mockup.steps.length - 1;
  const isReduced = useReducedMotion();

  // Pointer tilt: a few degrees toward the cursor, springing back on leave
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-7, 7]), TILT_SPRING);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [6, -6]), TILT_SPRING);

  function handlePointerMove(event) {
    if (isReduced || event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <div
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative mx-auto hidden w-full max-w-md [perspective:1100px] sm:block lg:mx-0 lg:justify-self-end"
    >
      {/* Soft glow as a static radial gradient: no blur filter, which is costly on low-end phones */}
      <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,rgb(200_143_108/0.32),transparent)]" />
      <motion.div
        style={isReduced ? undefined : { rotateX, rotateY }}
        initial={isReduced ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        className="rounded-panel bg-card p-5 text-ink shadow-float ring-1 ring-primary/25 will-change-transform sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-muted">{mockup.title}</p>
          <Badge tone="active">{mockup.status}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-display text-xl font-bold">{mockup.category}</p>
          <code className="rounded-md bg-card-dim px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-ink-muted">{mockup.reference}</code>
        </div>

        {/* Steps tick off one after another, like a matter moving forward */}
        <ol className="mt-5 space-y-3">
          {mockup.steps.map((step, stepIndex) => {
            const isDone = stepIndex < completedStepCount;
            const stepDelay = 0.55 + stepIndex * 0.35;
            return (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="relative flex size-6 shrink-0 items-center justify-center">
                  {isDone ? (
                    <motion.span
                      initial={isReduced ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 20, delay: stepDelay }}
                      className="flex size-6 items-center justify-center rounded-full bg-success text-white"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary-50 ring-2 ring-primary-100">
                      <span className="size-2 animate-live rounded-full bg-primary" />
                    </span>
                  )}
                </span>
                <motion.span
                  initial={isReduced ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: stepDelay - 0.1 }}
                  className={isDone ? 'text-ink-muted' : 'font-semibold text-ink'}
                >
                  {step}
                </motion.span>
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

        {/* Assigned strip lands last, once every step above has ticked */}
        <motion.div
          initial={isReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1], delay: 0.6 + mockup.steps.length * 0.35 }}
          className="mt-3 flex items-center gap-2 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-ink"
        >
          <BadgeCheck className="size-5 shrink-0 text-success" strokeWidth={2} />
          {mockup.assignedLabel}
        </motion.div>
      </motion.div>
    </div>
  );
}
