# 03 · WIREFRAMES (structural, annotated)

Legend: `[serif]` display type · `[mono]` label type · `(anim)` motion note
Canvas is Sui abyss `#030f1c`; panels `#131518`; ink `#f7f7f7`.

---

## W1 · LANDING  `/`

```
┌──────────────────────────────────────────────────────────────┐
│  COMPASS ◈                                  [mono] ENTER ▸   │  ← thin nav, 1px hairline
│                                                              │
│                                                              │
│            ● Autonomous capital, reasoning in public [mono]  │  ← badge pill (Kastle)
│                                                              │
│         Capital that thinks                                  │  [serif ~72px, -2px]
│         for itself.                                          │  (anim: SplitText chars
│                                                              │   rise+fade, stagger 20ms)
│         Vaults reason. Loans deliberate.                     │  [mono 15px, 50% ink]
│         An economy that never sleeps.                        │
│                                                              │
│              ( ENTER COMPASS )                               │  ← pill, mono, blue glow
│                                                              │
│  ~~~~~~~ ambient flow-lines drawing across background ~~~~~~ │  (anim: SVG paths self-
│                                                              │   draw, particles travel)
└──────────────────────────────────────────────────────────────┘

ACT 2 — "watch it think" (scroll-pinned)
┌──────────────────────────────────────────────────────────────┐
│   A vault detects a liquidity event...          [serif 40px] │  (pin section; as user
│                                                              │   scrolls, a REAL council
│   ┌────────────────────────────────┐                         │   deliberation replays:
│   │ RISK AGENT [mono]              │                         │   agent cards stack in
│   │ "Reducing lending exposure 15%"│  ← cards stack/swap     │   one atop another,
│   │ YIELD AGENT                    │    as you scroll        │   Taste-style stacking)
│   └────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────┘

ACT 3 — the economy in one gesture
│   full-width miniature of the living map, already flowing    │
│   "This is happening on-chain right now." [mono]  + 1 live # │

ACT 4 — enter
│   Huge serif: "Watch intelligent capital move."  ( ENTER )   │
```
No feature grids. No stats walls. Four acts, one idea each.

---

## W2 · ECOSYSTEM  `/ecosystem` — THE LIVING MAP

```
┌──────────────────────────────────────────────────────────────┐
│ ⚡ LIQUIDITY CRISIS · severity 7 · vaults are adapting [mono] │ ← event weather bar
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│  n a v   │        ┌────────┐                                 │
│  rail    │        │ VAULTS │◉━━━━━●━━━━━▶┌────────┐          │  nodes = glass panels
│          │        │ $4.2M  │             │ LOANS  │          │  edges = SVG curves
│          │        └────────┘◀━━●━━━━━━━━━│ 142    │          │  ● = capital particles
│          │           ┃  ┃                └────────┘          │  (anim: particles flow
│          │           ┃  ┗━━━●━━━▶┌──────────┐   ┃            │   along edges 24/7;
│          │           ▼           │ BUILDERS │   ▼            │   speed ∝ real volume;
│          │      ┌──────────┐     │ 8 funded │ ┌───────────┐  │   hover node → focus)
│          │      │PREDICTION│◀━●━━└──────────┘ │REPUTATION │  │
│          │      │ MARKETS  │                  │  oracle   │  │
│          │      └──────────┘                  └───────────┘  │
│          │                                                   │
├──────────┴───────────────────────────────────────────────────┤
│ ▸ VAULT-0 rebalanced: +10% builders · LOAN-7 approved 8.4% …│ ← decision ticker tape
└──────────────────────────────────────────────────────────────┘

click node → dossier panel slides from right (360px):
┌──────────────────┐
│ VAULTS [mono]    │
│ $4,200,000       │ (counting number)
│ 24 active        │
│ ── last moves ── │
│ · thesis excerpt │
│ · thesis excerpt │
│ ( OPEN VAULTS ▸) │
└──────────────────┘
```

---

## W3 · VAULT MARKETPLACE  `/vaults`

```
│  Funds [serif 48px]        ( CREATE FUND ) [mono pill]       │
│  Autonomous managers, reasoning in public. [mono dim]        │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐   │ cards stack-reveal
│  │ COMPASS ALPHA          [mono badge: QUANT] ● active   │   │ on scroll (each rises
│  │ "Liquidity risk rising. Rotating 10% from             │   │ 24px + fades, taste-
│  │  lending into builder allocations."     [serif 24px]  │   │ ease, stagger 80ms)
│  │                                                       │   │
│  │ objective   treasury    depositors   last decision    │   │
│  │ Max yield   $1.24M ↑    47           2h ago   [mono]  │   │
│  │ ▁▂▄▆▅▇ allocation strip (animated)                    │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌─── next fund card ────────────────────────────────────┐   │
```
Card = fund profile. THESIS leads; numbers follow. Click → shared-element expand.

---

## W4 · FUND ROOM  `/vaults/[id]` — FLAGSHIP

```
┌──────────────────────────────────────────────────────────────┐
│ Compass Alpha [serif 56px]   QUANT · BALANCED [mono badges]  │
│                                                              │
│ ┌──────────────────────────────────────────┐ ┌─────────────┐ │
│ │ CURRENT THESIS [mono]                    │ │ deposit     │ │
│ │                                          │ │ rail        │ │
│ │ "Liquidity risk increasing.              │ │             │ │
│ │  Reducing lending exposure by 15%.       │ │ treasury    │ │
│ │  Increasing builder allocation by 10%."  │ │ $1.24M      │ │
│ │                        [serif 28px]      │ │ (counting)  │ │
│ │ (anim: streams in like typed thought,    │ │             │ │
│ │  updated timestamp pulses)               │ │ [amount__]  │ │
│ └──────────────────────────────────────────┘ │ (DEPOSIT)   │ │
│                                              │ (WITHDRAW)  │ │
│ COUNCIL DISCUSSION [mono section head]       │             │ │
│ ┌────────────┐ ┌────────────┐                │ REBALANCE   │ │
│ │ ◉ RISK     │ │ ◉ YIELD    │  4 agent cards │ (AI btn,    │ │
│ │ "Exposure  │ │ "Lending   │  each with a   │  glowing)   │ │
│ │  within    │ │  APY out-  │  stance + a    │             │ │
│ │  bounds…"  │ │  performs…"│  live "voice"  └─────────────┘ │
│ └────────────┘ └────────────┘  (anim: cards breathe;         │
│ ┌────────────┐ ┌────────────┐   on rebalance, each speaks    │
│ │ ◉ LIQUIDITY│ │ ◉ MACRO    │   in sequence — typed text)    │
│ └────────────┘ └────────────┘                                │
│                                                              │
│ DECISION HISTORY [mono]                                      │
│ ── 07:14 ── Rebalanced. Builders 22%→25% ─ reasoning… ──     │
│ ── 05 Jul ─ Approved loan → Project Nexus, 3,200 cGEN ──     │
│    (vertical spine; entries reveal on scroll; each entry     │
│     expands on click to full reasoning — decisions = content)│
│                                                              │
│ ALLOCATION [mono]   donut + stream chart (draws on entry)    │
└──────────────────────────────────────────────────────────────┘
```

---

## W5 · CREDIT DESK  `/lending`

```
│ Credit Desk [serif]              ( REQUEST CREDIT ) [pill]   │
│                                                              │
│ THE DESK IS DECIDING [mono]      ← live feed, newest first   │
│ ┌─────────────────────────────────────────────┐              │
│ │ ✓ APPROVED · LOAN-12 · 3,200 cGEN · 8.4%    │  (stamps in) │
│ │ "Strong reputation (84). Purpose aligned    │              │
│ │  with ecosystem growth. Risk 22/100."       │              │
│ │ reputation 84 ▮▮▮▮▮▮▮▮▯▯ · 7 loans · 92%    │  (bars fill) │
│ └─────────────────────────────────────────────┘              │
│ ┌ ✗ DECLINED · LOAN-11 · reasoning excerpt … ┐               │
│                                                              │
│ REQUEST → full-screen DELIBERATION THEATER (3 stages):       │
│   READING PROFILE → EVALUATING (streamed text) → VERDICT     │
│   (see flow F5 — this sequence is the product)               │
```

## W6 · DEMO DAY  `/builders`

```
│ Demo Day [serif]                    ( PITCH PROJECT )        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ PROJECT NEXUS│ │ HELIX        │ │ …            │           │
│ │ one-line     │ │              │ │              │  cards    │
│ │ pitch [serif]│ │              │ │              │  tilt on  │
│ │ ────────────│ │              │ │              │  hover    │
│ │ INNOVATION 87│ │  (scores     │ │              │           │
│ │ RISK       34│ │   count up   │ │              │           │
│ │ ✓ FUNDED 1.8K│ │   in view)   │ │              │           │
│ └──────────────┘ └──────────────┘ └──────────────┘           │
```

## W7 · FINANCIAL IDENTITY  `/reputation`

```
│        ╭────────╮   Fortune [serif 44px]                     │
│        │  ◜847◝ │   ARCHITECT TIER [mono badge]              │
│        │  ring  │   contribution streams flow INTO the       │
│        ╰────────╯   ring from 4 sources (anim particles)     │
│                                                              │
│   ── LIFE TIMELINE ──  (vertical spine, scroll reveals)      │
│   ●  Jul 05  Funded: Project Nexus · +12 rep                 │
│   │                                                          │
│   ●  Jul 01  Prediction won: "Mainnet Q4" · +8               │
│   │                                                          │
│   ●  Jun 28  Loan repaid on time · +15                       │
│                                                              │
│   [cGEN faucet: PROVISION 1,000 cGEN — particles flow into   │
│    balance counter on claim]                                 │
```

## W8 · SIGNAL EXCHANGE  `/predictions`

```
│ Signal Exchange [serif]            ( CREATE MARKET )         │
│ ┌─────────────────────────────────────────────┐              │
│ │ "GenLayer mainnet ships Q4 2026?" [serif]   │              │
│ │ YES ▓▓▓▓▓▓▓▓░░░░░ NO      62% / 38%         │  tension bar │
│ │ (two fluids pressing; springs on stakes)    │              │
│ │ ⌁ 3 vaults hold positions · feeds lending   │  [mono dim]  │
│ │ ( BACK YES )  ( BACK NO )     [mono pills]  │              │
│ └─────────────────────────────────────────────┘              │
```
