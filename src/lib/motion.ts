import type { Variants, Transition } from "framer-motion";

/* ─── COMPASS MOTION TOKENS ─────────────────────────────────────────────
   Easing verified from tastelabs.com source (GSAP implementation).
   See design/04-motion-system.md
──────────────────────────────────────────────────────────────────────── */

export const EASE = {
  /** taste-ease — all entrances & layout moves */
  signature: [0.625, 0.05, 0, 1] as const,
  /** hovers, small UI */
  swift: [0.5, 0, 0.2, 1] as const,
  /** panels, drawers */
  settle: [0.6, 0.04, 0.3, 1] as const,
};

export const SPRING: Transition = {
  type: "spring",
  stiffness: 170,
  damping: 22,
};

export const DUR = {
  micro: 0.2,
  ui: 0.4,
  entrance: 0.7,
  page: 0.6,
  draw: 1.2,
} as const;

/* ─── SHARED VARIANTS ─── */

/** P2 — stack-reveal container: stagger children 80ms */
export const stack: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/** P2 — stack-reveal item: rise 24px + fade, taste-ease */
export const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.entrance, ease: EASE.signature },
  },
};

/** word-level split reveal (P1) — use inside overflow-hidden span */
export const wordUp: Variants = {
  hidden: { y: "110%" },
  visible: (i: number = 0) => ({
    y: "0%",
    transition: { duration: 0.75, ease: EASE.signature, delay: i * 0.03 },
  }),
};

/** route/page transition (tastePageIn) */
export const pageIn: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.page, ease: EASE.signature },
  },
  exit: {
    opacity: 0,
    y: -24,
    transition: { duration: 0.3, ease: EASE.swift },
  },
};

/** verdict stamp: scale-settle with slight overshoot */
export const stamp: Variants = {
  hidden: { opacity: 0, scale: 1.15 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: EASE.signature },
  },
};

/** in-view helper props — trigger once at 75% viewport */
export const inViewOnce = {
  initial: "hidden" as const,
  whileInView: "visible" as const,
  viewport: { once: true, amount: 0.25 },
};
