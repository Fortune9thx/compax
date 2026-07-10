# 05 · COMPONENT SYSTEM

Naming: `Cx*` prefix = Compass primitives. All live in `src/components/system/`.

---

## Typography primitives
| Component | Renders | Spec |
|---|---|---|
| `CxDisplay` | h1/h2 serif | display font, weight 400, tracking -0.03em, lh 1.02, SplitText reveal built in (`reveal` prop) |
| `CxLabel` | mono uppercase label | 11–12px, tracking +0.08em, 55% ink |
| `CxBody` | paragraph | mono 14–15px, weight 300, lh 1.6, 70% ink |
| `CxNumber` | animated figure | tabular-nums, counting animation on value change (P4) |

## Surfaces
| Component | Spec |
|---|---|
| `CxPanel` | bg `#131518`, border 1px `rgba(247,247,247,0.07)`, radius 16px. `glow` prop adds blue ambient shadow |
| `CxDossier` | right slide-in panel, 360px, settle-ease 0.45s, backdrop dims map 20% |
| `CxBadge` | pill, mono uppercase 10px, 1px border; variants: neutral / live (pulsing dot) / verdict colors |
| `CxTicker` | full-width marquee strip of decision fragments, 60s loop, hairline top border |

## The AI voice set (unique to Compass)
| Component | Purpose |
|---|---|
| `CxThesis` | Fund's current thesis: serif 24–28px quote block, streamed-in on update (P5), timestamp pulse |
| `CxCouncilCard` | One agent: identity dot (agent color), mono name, stance text, breathing idle; `speaking` state streams text |
| `CxDeliberation` | Full-screen 3-stage theater (READING → EVALUATING → VERDICT); orchestrates P4/P5/verdict stamp; used by lending, builders, vault genesis |
| `CxVerdict` | Stamp: APPROVED `#2ee6a8` / DECLINED `#ff6c3d` / PARTIAL `#ffc24d`; scale-settle entrance; reasoning excerpt below |
| `CxDecisionEntry` | Timeline row: time, one-line action, expandable full reasoning; spine-connected |

## Capital visualization set
| Component | Purpose |
|---|---|
| `CxFlowMap` | The ecosystem living map: nodes + curved SVG edges + particle engine (P3); node hover focus; click → dossier |
| `CxFlowParticles` | Standalone particle stream between two DOM anchors (used in verdicts, faucet, reputation streams) |
| `CxRing` | Draw-on score ring (P6) with counting center number |
| `CxAllocationDonut` | Draw-on donut + animated re-slice on rebalance (arcs tween between states) |
| `CxTensionBar` | Prediction YES/NO fluid bar; spring re-balance on stakes |
| `CxAllocationStream` | Stacked area of allocation history; draws on entry |

## Fund set
| Component | Purpose |
|---|---|
| `CxFundCard` | Marketplace card: thesis-first layout, allocation strip, hover lift 4px + border brighten; shared-element `layoutId` to fund room |
| `CxDepositRail` | Quiet right rail: balance, amount input, DEPOSIT/WITHDRAW pills, tx state narration |

## Input set (forms-as-briefing)
| Component | Spec |
|---|---|
| `CxField` | mono input, bottom-border only (no boxes), focus = border animates to `#298dff` left-to-right |
| `CxSlider` | risk appetite: track fills with gradient grey→blue→orange, thumb shows live value |
| `CxPill` (button) | Kastle pill: mono uppercase, 1px border; primary = `#298dff` fill + glow `0 0 24px rgba(41,141,255,0.35)`; hover scale 1.02 swift-ease |
| `CxStepper` | one-question-per-screen briefing shell with progress hairline |

## Feedback set
| Component | Spec |
|---|---|
| `CxThinking` | "AI thinking" loader: orbiting particle + shimmer, mono caption cycles ("reading treasury…", "weighing risk…") |
| `CxEmpty` | invitation state: ambient dotted flow-line + serif line + action pill |
| `CxToastTx` | tx lifecycle toast: SUBMITTED → FINALIZING (progress hairline) → CONFIRMED (stamp) |

## Composition rules
1. Serif = meaning (theses, questions, verdicts' subjects). Mono = machinery
   (labels, numbers, buttons, metadata). Never mix roles.
2. One glow element max per viewport. Glow = "the AI is here."
3. Hairlines (1px, 7% white) separate; never heavy borders or shadows for structure.
4. Every number is a `CxNumber`. Every list entrance is a stack-reveal. No exceptions.
