# COMPASS DESIGN DNA

> COMPASS IS NOT A DASHBOARD.
> COMPASS IS NOT A DEFI APP.
> COMPASS IS NOT A COLLECTION OF FORMS.
>
> Compass is an autonomous financial operating system.
> Every screen must communicate intelligence, capital movement,
> decision-making, and adaptation.
>
> If a page can be mistaken for a standard crypto dashboard, redesign it.
> Users should feel like they are observing an economy in motion,
> not managing spreadsheets.

**The feeling on entry:** "I'm watching intelligent capital move." — never "I'm filling forms."

---

## Reference Synthesis (verified from live sites, 2026-07)

### Kastle (kastle.ai) → typography & editorial restraint
Extracted from computed styles:
- Display: **Reckless Neue Light** — a light editorial *serif*, 51px H1, weight 400, letter-spacing **-2px**, line-height 1.0
- Labels/body-meta: **JetBrains Mono**, 15px, weight 300, ~50% opacity color `rgba(38,38,38,0.5)`
- Ink: `#171717` on off-white
- Buttons: pill-shaped, thin outline, MONO UPPERCASE text, soft purple glow on primary
- Signature moves: live **counting numbers** ($500M → $563M ticks while you watch), framed
  dashboard vignettes inside thin-bordered cards, mono badge pills ("● Most deployed…"),
  grayscale logo strip, glowing 3D orb as the "agent" motif

**What we steal:** serif-display × mono-label pairing; pill mono buttons; badge pills;
counting numbers; the restraint (huge whitespace, thin 1px borders, few colors).

### Taste Labs (tastelabs.com) → motion system
Extracted from source:
- Stack: **GSAP 3.15 + ScrollTrigger + SplitText** + Lottie + Flickity
- Signature easing: `cubic-bezier(0.625, 0.05, 0, 1)` — fast start, long luxurious settle
- Secondary easings: `cubic-bezier(0.6, 0.04, 0.3, 1)`, `cubic-bezier(0.5, 0, 0.2, 1)`
- Durations: 0.4–0.8s transforms; 0.2s color/opacity micro-transitions; 0.6s page-in
- Text enters by **SplitText** — lines/words/chars translate+fade in sequence on scroll
- Fluid type via `clamp()` (e.g. `clamp(20px, 5.9vw, 54px)`)
- Palette: cream `#eaece7`, ink `#111111`, grey `#747370`, accent `#FF4C24`, blue `#002bba`
- Page transition: `tastePageIn 0.6s ease` keyframe

**What we steal:** the easing curve, split-text reveals, scroll choreography,
Lottie-grade hero animation ambition, page-in transitions.

### Sui (sui.io) → color system
Extracted from sui-v2.shared CSS:
- Primary blue: `#298dff` (132 uses — THE brand color)
- Light blue: `#4da2ff`
- Ocean depth ramp: `#356af0` → `#0f42c3` → `#0a3092`
- Deep abyss: `#030f1c` (hero/dark sections)
- Grey ramp: 50 `#f4f5f7` · 100 `#e0e2e6` · 200 `#c2c6cd` · 300 `#a1a7b2` · 400 `#89919f`
  · 500 `#6c7584` · 600 `#4b515b` · 700 `#343940` · 800 `#222529` · 900 `#131518`
- Warm counter-accent: `#ff6c3d`
- Cultured white: `#f7f7f7`
- Gradients: black→`#298dff`→white vertical sweeps

**What we steal:** the entire color system. Compass lives in Sui's ocean.

---

## The Compass Formula

```
Sui's ocean colors
+ Kastle's serif/mono editorial typography
+ Taste Labs' GSAP scroll choreography
+ capital-flow visualization as the core motif
= an autonomous financial operating system you WATCH
```

## Non-negotiables
1. No page may feel static. Every page has at least: one ambient motion (flow, pulse,
   ticker), one scroll-choreographed reveal, and state transitions on all data changes.
2. AI reasoning is content. Decisions render as narrative — thesis, council voices,
   verdicts — never as bare status chips.
3. Capital is visible. Money moving between vaults/loans/builders/predictions is drawn,
   animated, and traceable.
4. Forms are conversations. Any input flow reads as "briefing the AI," and submission
   is followed by watching the AI deliberate live.
5. Sourced assets (illustrations, lottie files, 3D orbs, logos) are NEVER invented or
   placeholder-faked — always ask the owner to provide them first.
