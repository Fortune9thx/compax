/* ─── Smooth scroll (Lenis) ──────────────────────────────────────────────
   The base layer of the motion system. Everything else — staggered reveals,
   parallax — reads as premium only if the scroll itself has weight.
   Disabled automatically for prefers-reduced-motion.
──────────────────────────────────────────────────────────────────────── */
"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => 1 - Math.pow(1 - t, 3), // easeOutCubic
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
    });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
