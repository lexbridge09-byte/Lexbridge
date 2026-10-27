'use client';

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { useRef } from 'react';

// Numbered steps whose connecting line fills as the list scrolls through the viewport.
// Only transforms and opacity animate, so the list keeps its size from the first paint.
export function StepsTimeline({ items }) {
  const listRef = useRef(null);
  const isReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: listRef, offset: ['start 80%', 'end 55%'] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });

  return (
    <ol ref={listRef} className="relative space-y-7">
      <span aria-hidden="true" className="absolute bottom-5 left-5 top-5 w-px bg-line-canvas" />
      <motion.span
        aria-hidden="true"
        style={{ scaleY: isReduced ? 1 : lineScale }}
        className="absolute bottom-5 left-5 top-5 w-px origin-top bg-gradient-to-b from-primary-bright to-primary"
      />
      {items.map((step, stepIndex) => (
        <TimelineStep key={step.title} step={step} stepIndex={stepIndex} stepCount={items.length} progress={scrollYProgress} isReduced={isReduced} />
      ))}
    </ol>
  );
}

function TimelineStep({ step, stepIndex, stepCount, progress, isReduced }) {
  // Each step lights up as the line reaches it
  const threshold = stepCount > 1 ? stepIndex / (stepCount - 1) : 0;
  const stepOpacity = useTransform(progress, [Math.max(0, threshold - 0.25), threshold], [0.45, 1]);

  return (
    <motion.li style={isReduced ? undefined : { opacity: stepOpacity }} className="relative flex gap-4">
      <span className="tabular relative flex size-10 shrink-0 items-center justify-center rounded-full border border-primary bg-cta font-display text-[15px] font-bold text-canvas">
        {stepIndex + 1}
      </span>
      <div className="pt-1.5">
        <h3 className="text-h4 text-on-canvas">{step.title}</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-on-canvas-muted">{step.description}</p>
      </div>
    </motion.li>
  );
}
