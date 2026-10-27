'use client';

import { motion, useReducedMotion } from 'motion/react';

const EASE_OUT_SOFT = [0.23, 1, 0.32, 1];
const VIEWPORT = { once: true, margin: '0px 0px -12% 0px' };

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT_SOFT } },
};

// Fades and lifts its content once as it scrolls into view. Transform/opacity only: no layout shift.
export function Reveal({ as = 'div', delay = 0, className, children, ...props }) {
  const isReduced = useReducedMotion();
  const Element = motion[as];
  return (
    <Element
      initial={isReduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.6, ease: EASE_OUT_SOFT, delay }}
      className={className}
      {...props}
    >
      {children}
    </Element>
  );
}

// A list whose StaggerItem children rise in sequence when the list enters the viewport
export function Stagger({ as = 'ul', gap = 0.06, className, children, ...props }) {
  const isReduced = useReducedMotion();
  const Element = motion[as];
  return (
    <Element
      initial={isReduced ? false : 'hidden'}
      whileInView="shown"
      viewport={VIEWPORT}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: gap } } }}
      className={className}
      {...props}
    >
      {children}
    </Element>
  );
}

export function StaggerItem({ as = 'li', className, children, ...props }) {
  const Element = motion[as];
  return (
    <Element variants={itemVariants} className={className} {...props}>
      {children}
    </Element>
  );
}
