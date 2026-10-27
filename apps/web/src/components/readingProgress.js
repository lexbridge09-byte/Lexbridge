'use client';

import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

// Thin rose-gold bar under the site header that fills as you read the page
export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, restDelta: 0.001 });
  const isReduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: isReduced ? scrollYProgress : progress }}
      className="fixed inset-x-0 top-16 z-40 h-0.5 origin-left bg-gradient-to-r from-primary to-primary-bright"
    />
  );
}
