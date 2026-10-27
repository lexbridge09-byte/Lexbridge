'use client';

import { motion, useReducedMotion } from 'motion/react';

const EASE_DRAW = [0.65, 0, 0.35, 1];

// Main cable as three quadratic spans (anchor → tower → tower → anchor); hangers drop from points on it
const CABLE_SPANS = [
  [[60, 370], [240, 300], [410, 112]],
  [[410, 112], [500, 300], [590, 112]],
  [[590, 112], [760, 300], [940, 370]],
];
const HANGER_POINTS = CABLE_SPANS.flatMap(([[x0, y0], [cx, cy], [x1, y1]]) =>
  [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => [
    Math.round((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1),
    Math.round((1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1),
  ]),
);

// Decorative suspension-bridge line art that draws itself once behind the hero (the logo's bridge, at scale).
// Absolutely positioned and aria-hidden, so it never shifts layout or competes with the headline.
export function HeroBridge() {
  const isReduced = useReducedMotion();
  const draw = (delay, duration = 1.6) =>
    isReduced
      ? {}
      : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { pathLength: { duration, ease: EASE_DRAW, delay }, opacity: { duration: 0.2, delay } } };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 460"
      preserveAspectRatio="xMidYMax slice"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] w-full opacity-[0.38] [mask-image:linear-gradient(to_top,black_30%,transparent)]"
      fill="none"
      stroke="url(#heroBridgeGold)"
      strokeLinecap="round"
    >
      <defs>
        <linearGradient id="heroBridgeGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c88f6c" stopOpacity="0.2" />
          <stop offset="0.5" stopColor="#f3cdb1" />
          <stop offset="1" stopColor="#c88f6c" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Deck */}
      <motion.path d="M0 380 L1000 380" strokeWidth="3" {...draw(0.1, 1.4)} />
      {/* Towers */}
      <motion.path d="M400 440 V110 M420 440 V110 M400 160 H420 M400 250 H420" strokeWidth="2.5" {...draw(0.4, 1)} />
      <motion.path d="M580 440 V110 M600 440 V110 M580 160 H600 M580 250 H600" strokeWidth="2.5" {...draw(0.5, 1)} />
      {/* Main cables */}
      <motion.path d="M60 370 Q240 300 410 112 Q500 300 590 112 Q760 300 940 370" strokeWidth="2" {...draw(0.8, 1.8)} />
      {/* Hangers */}
      {HANGER_POINTS.map(([x, y], hangerIndex) => (
        <motion.path key={x} d={`M${x} ${y} V380`} strokeWidth="1" {...draw(1.4 + hangerIndex * 0.05, 0.5)} />
      ))}
    </svg>
  );
}
