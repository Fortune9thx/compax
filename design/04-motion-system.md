# 04 · MOTION SYSTEM — "Capital in Motion"

Derived from Taste Labs' verified implementation (GSAP 3.15 + ScrollTrigger + SplitText),
adapted to our stack (Framer Motion + custom SVG particle engine).

---

## 1 · Easing tokens

```ts
// src/lib/motion.ts
export const EASE = {
  signature: [0.625, 0.05, 0, 1],   // taste-ease — ALL entrances & layout moves
  swift:     [0.5,   0,    0.2, 1], // hovers, small UI
  settle:    [0.6,   0.04, 0.3, 1], // panels, drawers
  spring:    { type: "spring", stiffness: 170, damping: 22 }, // odds bars, gauges
} as const;

export const DUR = {
  micro: 0.2,   // color/opacity hover
  ui:    0.4,   // buttons, chips, toggles
  entrance: 0.7,// cards, sections (taste uses 0.4–0.8)
  page:  0.6,   // route transitions (tastePageIn)
  draw:  1.2,   // SVG path self-drawing, rings, donuts
} as const;
```

## 2 · The six motion primitives

Every page must use ≥3 of these. No page ships static.

### P1 — SplitText reveal (headlines)
Serif display lines split into words; each word `y: "110%" → 0`, `opacity 0 → 1`,
stagger 30ms/word, taste-ease, triggered at 75% viewport. (Framer: wrap words in
overflow-hidden spans; `useInView` once.)

### P2 — Stack-reveal (card sequences)
Cards rise 24px + fade, stagger 80ms, taste-ease. For pinned sections (landing Act 2):
cards physically stack atop each other as scroll progresses (scale 0.96 + y-offset on
the card beneath — Taste Labs card-stacking).

### P3 — Capital particles (THE Compass signature)
SVG cubic-bezier paths between nodes; 2–4px circles animate along `offset-path`
(or Framer `motion.circle` + path length), 3–6s loops, count/speed ∝ real on-chain
volume. Color: `#4da2ff` normal, `#ff6c3d` under stress events. Used on: landing bg,
ecosystem map, deliberation verdicts, faucet claim, reputation streams.

### P4 — Counting numbers (Kastle)
All treasury/score/rate figures animate from previous → new value, 0.8s, taste-ease,
tabular-nums. Numbers NEVER just swap.

### P5 — Streamed reasoning (AI voice)
AI text arrives word-by-word (35ms/word) with a soft caret pulse — deliberation
theater, council voices, thesis updates. Reduced-motion: instant with fade.

### P6 — Draw-on (rings, paths, donuts)
`pathLength 0 → 1`, 1.2s, taste-ease: reputation ring, allocation donut, map edges,
timeline spine. Triggered in-view, once.

## 3 · Scroll choreography rules
- One pinned "scrollytelling" moment max per page (landing Act 2, fund-room thesis).
- Everything else: in-view triggers at 70–80% viewport, animate ONCE (no re-trigger).
- Parallax only on ambient layers (flow-lines, glow fields), max 8% translate.

## 4 · State transitions
- Route change: outgoing content `y: -24, opacity 0` (0.3s) → incoming `y: 24 → 0,
  opacity 0 → 1` (0.6s taste-ease). Persistent elements (nav, ticker) do not move.
- Data update (poll/refetch): changed value pulses (bg `#298dff` @10% → transparent,
  0.8s) + counting number. Lists animate layout with `AnimatePresence`.
- Verdict stamp: `scale 1.15 → 1` + `opacity 0 → 1`, 0.35s, overshoot; simultaneous
  1px border flash in verdict color.

## 5 · Ambient layer (never static)
Each page carries one always-on subtle motion:
- Landing/Ecosystem: particle flows.
- Fund room: council avatars "breathe" (scale 1 → 1.015, 4s sine loop).
- Lending: feed items' live-dot pulses.
- Reputation: ring shimmer sweep every 8s.
- Ticker tape: continuous marquee, 60s loop, pauses on hover.

## 6 · Performance & dignity
- Transforms/opacity only; no layout-thrash animation. `will-change` on particles.
- `prefers-reduced-motion`: particles freeze into static dotted paths; SplitText
  becomes simple fade; counters snap. All meaning must survive without motion.
- Cap simultaneous particles: 60 (map), 20 (ambient backgrounds).
