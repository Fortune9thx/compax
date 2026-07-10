# Handoff: Compass — The Operating System for Autonomous Capital

## Overview
Compass is an autonomous financial operating system built on GenLayer. Users state objectives; AI councils reason, allocate capital, adapt to economic events, and record every decision onchain. This handoff contains the complete design language, signature asset system, and three built hi-fi pages (Landing, Vault Detail, Ecosystem Overview), plus specifications for the six remaining pages.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look, layout, and motion. They are NOT production code. Your task is to **recreate these designs in the target codebase's environment** (React/Next.js, Vue, etc.) using its established patterns. If no frontend exists yet, React + a plain CSS-in-JS or Tailwind setup is a fine choice; there are no exotic dependencies — everything is inline-styled HTML + SVG + CSS keyframes.

Open each `.dc.html` file in a browser to see the live design. The visible markup between `<x-dc>` tags is ordinary HTML with inline styles; `{{ }}` holes are filled from the `renderVals()` data at the bottom of each file — treat that data as the mock API shape.

## Fidelity
- **High-fidelity (recreate pixel-perfectly):** `Compass Landing v2.dc.html`, `Compass Vault Detail.dc.html`, `Compass Ecosystem Overview.dc.html`, `Compass Design System.dc.html` (component library + motion tokens), `Compass Asset Specification.dc.html`, `Compass Page Blueprints.dc.html`.
- **Low-fidelity (structure/flow only):** `Compass Structure.dc.html` (sitemap + 10 user flows), `Compass Wireframes.dc.html` (lo/mid-fi for all 9 pages).
- **Superseded (do NOT implement):** `Compass Foundations.dc.html` and `Compass Landing.dc.html` — the pre-reset editorial/orbital direction, kept for history only.

## Design Direction (post-reset, authoritative)
Institutional sans-first — Bloomberg × Palantir × Vision Pro. NO orbital rings, planets, particles, purple gradients, or decorative animation. Serif appears ONLY as the "reasoning accent" (agent statements, vault objectives, council questions — always italic Newsreader). Every animation encodes capital, risk, or consensus.

## Design Tokens

### Colors
- `#070A12` — Void: page background
- `#0A0F1A` — Panel background (cards on pages)
- `#0F1626` — Depth / atmosphere gradients
- `#10182A` — SVG node fill
- `#161E2F` — Surface (design-system cards)
- `#ECEBE6` — Ink: primary text
- `rgba(236,235,230,.6/.45/.4)` — secondary/tertiary/label text
- `rgba(236,235,230,.08–.12)` — hairlines, dividers, borders (borders are `rgba(236,235,230,.1)`)
- `#7FD4D4` — Reason cyan: live intelligence, consensus, links, primary buttons. Reserved — never decorative.
- `#4A7DD6` — Signal blue (sparse)
- `#6FBF8F` — Yield positive / agreement
- `#D6926A` — Risk elevated / events / dissent
- Link colors: `a { color:#7fd4d4 }`, hover `#a8e6e6`

### Typography (Google Fonts)
- **IBM Plex Sans** — leads everything. Display 300 (44–56px, letter-spacing −.015em), headings 300–400 (30–40px, −.01em), UI 400–600 (12.5–15px)
- **IBM Plex Mono** — all data, labels, timestamps, TX hashes, tickers. 9–11px labels with .15–.25em letter-spacing, uppercase
- **Newsreader italic** — reasoning accent ONLY (agent quotes, objectives). 13.5–21px italic
- (Design-system file also loads Instrument Sans/Serif + Spline Sans Mono for legacy sections — do not carry these into new builds.)

### Spacing / Grid / Radius / Elevation
- 4px base scale: 4·8·12·16·24·32·48·64·96
- Content max-width 1180px (marketing) / 1360px (app pages), 40–48px page padding, 12-col mental grid, 16–24px gaps
- Radius: 6–8px controls, 8–10px cards, 12–14px panels
- Elevation by glass: L1 solid card; L2 `rgba(26,35,51,.55)` + `backdrop-filter:blur(12px)`; L3 adds cyan border `rgba(127,212,212,.35)`. Sticky nav: `rgba(7,10,18,.85)` + blur(14px)

### Motion tokens
- AMBIENT (flow dashes, scanlines, tickers): 2.4–14s, linear/ease-in-out, infinite
- REVEAL: 500ms `cubic-bezier(.22,1,.36,1)`, stagger 120ms
- DECISION (allocation settles): 800ms `cubic-bezier(.22,1,.36,1)`, no bounce
- HOVER/FOCUS: 180ms ease-out
- PAGE: 400ms fade + 12px rise
- Loading = council thinking: three dots ticking (`ceTick` 1.8s, delays 0/.3/.6s). Never spinners.
- Key keyframes (copy from files): `ceFlow` (stroke-dashoffset −96, flow dashes), `cePulse`, `ceScan` (Treasury Brain scanline), `ceTick`, `ceDrift` (ticker, translateX −50% on a duplicated run), `ceRise`, `ceProp` (event propagation ring)

## Signature Assets (proprietary — the identity)
1. **Capital Engine** — directed SVG circuit: Treasury Brain core → Lending / Builders / Predictions / Reserves nodes; green yield-return loop back to core. Line WEIGHT = allocation share (ghost track stroke 3–11px under a 1–2px animated dash line with arrowhead marker). Cyan = deployment, green = return, amber dashed = pending shift.
2. **Treasury Brain** — rounded-rect instrument: scanline animation, objective sentence in italic serif, RISK/YIELD/CONFIDENCE mono readouts + confidence bar.
3. **AI Council Interface** — 4 analysts (RSK Risk / YLD Yield / LIQ Liquidity / MAC Macro) as chip + name + stance tag (AGREES green / DISSENTS amber / HOLD) + italic-serif statement + confidence hairline bar with %. Consensus banner: cyan-bordered `rgba(127,212,212,.06)` box, "CONSENSUS FORMING · 3/4". Dissent is always shown, never hidden.
4. **Decision Timeline** — lifecycle spine with colored dots: amber EVENT → cyan DEBATE → green CONSENSUS → cyan ALLOCATION → white RECORDED, connected by 1px hairlines.
5. **System Pulse Ticker** — full-width drifting mono line of lifecycle happenings, on every page.

See `Compass Asset Specification.dc.html` for the complete Category A–E asset list with BUILT / PARTIAL / REQUIRED status. Items marked ○ REQUIRED (e.g. reallocation cinematic, economy map interactivity, analyst icon set, reputation strata) must be produced before their sections ship — no placeholders.

## Screens

### 1. Landing (`Compass Landing v2.dc.html`)
Sticky nav (logo, anchors, cyan Enter button) → 3-col hero `minmax(240px,300px) minmax(420px,1fr) minmax(240px,300px)`, stacks to 1-col below 1100px: LEFT value prop ("An economy that *thinks* before it moves."), CENTER Capital Engine panel, RIGHT live council feed → pulse ticker → sections 02–06: How Capital Moves (5-step circuit strip), The Council (question + 2×2 debate grid + consensus row), Economic Events (4 cards), The Record (sticky-left copy + lineage timeline), Vaults (3 cards) → CTA → footer.

### 2. Vault Detail (`Compass Vault Detail.dc.html`) — most important page
Nav (breadcrumb, live status, quiet Withdraw/Deposit) → header (name 40px, objective italic serif quote, TREASURY/YIELD/CONFIDENCE/REP instruments) → **layer switch: Brain / Treasury / History** (tab-style buttons, 2px cyan underline on active; content swaps with 400ms rise). Brain = council chamber + reasoning feed + events rail. Treasury = vault-scoped Capital Engine with PENDING shifts ghosted (amber), allocation bars current→pending (ghost band), 24h flows. History = decision lineage timeline + record table (№ / decision / consensus / TX). State: `layer: 'brain'|'treasury'|'history'`.

### 3. Ecosystem Overview (`Compass Ecosystem Overview.dc.html`)
Nav + pulse → Economy Map (grid-anchored SVG circuit, 1280×400 viewBox: vault nodes sized by treasury → market nodes → Record node; animated flows; amber event dot with `ceProp` ring + dashed propagation lines to affected councils) → 3-col rail: live deliberations (clickable) / today's decisions / events feed. No KPI hero — totals live in the map legend line.

### Remaining pages (specified, not built)
Marketplace, Create Vault, Lending, Builder Funding, Predictions, Reputation — full zone-by-zone blueprints in `Compass Page Blueprints.dc.html`; component recipes in `Compass Design System.dc.html`; flows in `Compass Structure.dc.html`.

## Interactions & Behavior
- Buttons: primary cyan bg → `#a8e6e6` hover; secondary 1px `rgba(236,235,230,.22)` border → `.5` hover; card hover: border → `rgba(127,212,212,.4)` over 180ms
- Vault cards, deliberation cards, record rows are clickable → Vault Detail (respective layer)
- Objective input is a fill-in-the-blank sentence (cyan-underlined slots), not a form
- All live data (council statements, ticker, flows) should stream from real state; the `renderVals()` objects define the expected shapes

## State Management (suggested)
- Global: live deliberations, event stream, pulse-ticker feed (websocket-shaped)
- Vault Detail: `activeLayer`, current deliberation (question, agents[{glyph,name,stance,line,confidence}], tally), allocations (current + pending), record rows
- Allocation changes animate width over 800ms when pending→settled

## Assets
No raster images anywhere. All visuals are inline SVG + CSS. Fonts from Google Fonts (IBM Plex Sans, IBM Plex Mono, Newsreader). Logo: compass-needle mark (`M17 4 L21.5 17 L17 30 L12.5 17 Z` needle in cyan + thin circle) — recreate as an SVG component.

## Screenshots
Reference captures in `screenshots/`: `landing.png`, `vault-detail-brain.png`, `vault-detail-treasury.png`, `vault-detail-history.png`, `ecosystem-overview.png`. The HTML files remain the source of truth (screenshots freeze animations mid-frame).

## Files
- `Compass Landing v2.dc.html` — hi-fi landing (authoritative)
- `Compass Vault Detail.dc.html` — hi-fi vault detail
- `Compass Ecosystem Overview.dc.html` — hi-fi overview
- `Compass Design System.dc.html` — tokens, type, controls, component library, motion spec
- `Compass Asset Specification.dc.html` — signature asset inventory + status
- `Compass Page Blueprints.dc.html` — all 9 page specs
- `Compass Structure.dc.html` — sitemap + user flows
- `Compass Wireframes.dc.html` — lo/mid-fi wireframes
- `support.js` — prototype runtime only; ignore for implementation
