# COMPAX — Master Build Specification
> This file is the single source of truth for the entire CompaX build.
> Read this fully before touching any file.

---

## What Is CompaX

CompaX is a production-quality GenLayer Bradbury testnet application.
It is an AI-managed financial ecosystem where intelligent vaults continuously
allocate capital across lending markets, staking pools, prediction markets, and
builder funding — entirely driven by GenLayer intelligent contracts.

Users do not manage strategies. Users define objectives. The contracts reason.

---

## Project Location

```
C:\Users\HP\Desktop\compax
```

Dev server: `node C:/Users/HP/Desktop/compax/node_modules/next/dist/bin/next dev C:/Users/HP/Desktop/compax --port 3002`
Node binary: `C:/Users/HP/nodejs/node.exe`
npm/npx: prefix every shell command with `$env:Path = "C:\Users\HP\nodejs;" + $env:Path`

---

## Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | TailwindCSS v4 |
| Animation | Framer Motion |
| State | Zustand |
| Charts | Recharts |
| UI Primitives | Radix UI + custom components |
| Icons | Lucide React |
| Contracts | GenLayer Intelligent Contracts (Python / GenVM) |
| Chain | GenLayer Bradbury Testnet |
| Client | genlayer-js |

---

## Design System

### Inspiration Sources

**Layout + Typography → Kastle (https://www.kastle.ai/)**
- Large editorial section spacing (py-24 to py-40)
- Left-aligned headings at section level, centred only for hero
- Clean card hierarchy: primary card > secondary card > stat block
- Tight tracking on headings (`tracking-tight`), regular on body
- Section labels as small caps above headings (`text-xs uppercase tracking-widest`)
- Two-column layouts at desktop that collapse gracefully

**Motion System → Taste Labs (https://tastelabs.com/#product)**
- Scroll-triggered stagger reveals (`useInView` + `motion.div` with delay cascades)
- Parallax depth on hero backgrounds (subtle, 0.1–0.2 factor only)
- Card hover: subtle lift (`y: -4`) + border brightening, never scale
- Page transitions: fade + slight upward slide (opacity 0→1, y 12→0, 0.4s ease)
- Animated counters on numbers when they enter viewport
- Section fade progression: each section appears as it scrolls into view
- No bounce, no spring overdrive — `ease: [0.22, 1, 0.36, 1]` custom easing

**Color + Visual Cleanliness → Sui (https://www.sui.io/)**
- Deep navy base: `#060d1f` (background), `#0a1628` (card), `#0f2040` (elevated card)
- Charcoal surfaces: `#1a1f2e`, `#252b3b`
- Accent: muted cyan `#22d3ee` (primary), `#67e8f9` (lighter), `#06b6d4` (deeper)
- Supporting accents: `#38bdf8` (sky), `#818cf8` (indigo — predictions), `#34d399` (emerald — builders), `#fb923c` (orange — warnings)
- Off-white text: `#f0f4f8` (primary), `#8892a4` (muted), `#4a5568` (disabled)
- Borders: `rgba(255,255,255,0.06)` default, `rgba(255,255,255,0.12)` hover
- Gradients: always subtle, max 2-stop, never rainbow
- Typography weight: bold (700) headlines, medium (500) labels, regular (400) body
- Geist Sans throughout (already configured in layout.tsx)

### DO NOT USE
- Neon or glowing borders
- Cyberpunk / gaming aesthetics
- Glassmorphism overload (one layer of `backdrop-blur` max)
- Purple/pink gradients
- Stock photos or crypto clichés
- Meme coin aesthetics
- Aggressive shadows

### Component Conventions

```tsx
// Card base
"rounded-2xl border border-white/6 bg-[#0a1628] p-6"

// Card hover state
"hover:border-white/12 hover:bg-[#0f2040] transition-all duration-300"

// Section label (above heading)
"text-xs font-medium text-cyan-400 tracking-widest uppercase mb-4"

// Primary heading
"text-4xl md:text-5xl font-bold text-[#f0f4f8] tracking-tight"

// Body text
"text-sm text-[#8892a4] leading-relaxed"

// Primary CTA
"px-6 py-3 rounded-xl bg-cyan-500 text-[#060d1f] font-semibold text-sm
 hover:bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]
 hover:shadow-[0_0_40px_rgba(6,182,212,0.45)] transition-all duration-200"

// Secondary CTA
"px-6 py-3 rounded-xl border border-white/10 text-[#f0f4f8] font-medium text-sm
 hover:bg-white/5 hover:border-white/20 transition-all duration-200"

// Accent badge
"px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/5
 text-cyan-300 text-xs font-medium"
```

### Animation Patterns

```tsx
// Standard section reveal
const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22,1,0.36,1] } }
}

// Stagger children
const containerVariants = {
  visible: { transition: { staggerChildren: 0.1 } }
}

// Card hover
whileHover={{ y: -4 }}
transition={{ duration: 0.2, ease: "easeOut" }}

// Page transition wrapper (wrap every page top-level div)
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
>
```

---

## Asset Rule

**CRITICAL — NEVER invent, generate, or use placeholder artwork.**

Whenever a page or component needs:
- Illustrations
- Icons beyond Lucide
- Diagrams
- Logo variations
- Character art
- Background images
- Marketing graphics

→ **STOP. Ask the user to provide the asset. Do not proceed with that component until the asset is received.**

Lucide React icons are always fine to use freely.

---

## Economy

### Tokens

| Token | Type | Acquisition | Use |
|---|---|---|---|
| cGEN | Utility | Faucet (once per 24h) | Deposits, loans, staking, predictions |
| rGEN | Reputation | Earned via actions | AI decision weighting, loan eligibility |

### Yield Sources
1. Lending interest — borrowers repay principal + interest
2. Prediction market fees — participation fees on resolved markets
3. Builder funding returns — projects repay capital with ROI share
4. Staking pool rewards — protocol-generated staking yield

---

## Application Pages

### PAGE 1 — Landing (`/`)
**Status: BUILT**

Sections (all complete):
- Nav (fixed, scroll-aware, CX logo, cyan CTA)
- Hero ("Your Capital Should Think" + 4 live stat cards)
- How It Works (3-step animated grid)
- Ecosystem Cards (4 markets: Lending, Staking, Predictions, Builders)
- Live Decision Feed (animated real-time AI reasoning stream)
- Footer

Do not rebuild this page. Enhance only if instructed.

---

### PAGE 2 — Ecosystem Dashboard (`/ecosystem`)
**Status: STUB — BUILD NEXT**

Layout: Full-page dashboard with sidebar nav + main content area.

**Sidebar:**
- CompaX logo
- Navigation links to all pages
- Wallet connect status
- cGEN + rGEN balance display

**Main sections (top to bottom):**

#### Global Metrics Bar
Four stat cards in a horizontal row:
- Total TVL (reads from VaultManager contract)
- Total Active Loans (reads from LendingMarket contract)
- Active Vaults (reads from VaultManager contract)
- Total Yield Generated (computed)

Animated counter on first render.

#### Market Overview
Two-column grid. Left: Lending + Staking. Right: Builders + Predictions.
Each panel shows current APY/rate, total capital deployed, and a sparkline (Recharts).

#### Economic Events
Prominent section. Reads from EconomicEvents contract.
Display active event as a banner at top:
```
[event type badge]  AI Boom  [since timestamp]
Vaults are increasing exposure to AI-sector builder projects.
```
Below: scrollable history of past events (type, name, start, impact summary).
Events have color coding:
- Bull Market → emerald
- Credit Crunch → orange
- Liquidity Crisis → red
- AI Boom → cyan
- Protocol Exploit → red/urgent

#### Live Activity Feed
Right column or full-width bottom section.
Stream of recent decisions from all vaults.
Same style as landing page DecisionFeed but pulling from contract read.

---

### PAGE 3 — Vault Marketplace (`/vaults`)
**Status: STUB — BUILD AFTER PAGE 2**

Grid of vault cards. Each card:
- Vault name + AI personality tag
- Strategy label (Conservative / Balanced / Growth / Custom)
- TVL with trend arrow
- 30-day performance %
- Risk level (Low / Medium / High) with color dot
- Current allocation donut — 4 segments (Lending/Staking/Predictions/Builders)
- "View Vault" CTA

**AI Personalities:**
| Name | Style | Strategy |
|---|---|---|
| Warren | Conservative, long-horizon | Capital preservation |
| Quant | Data-driven, systematic | Yield optimization |
| Builder | Community-focused | Builder funding |
| Opportunist | Adaptive, contrarian | Yield seeking |

Top of page: filter bar (All / Conservative / Balanced / Growth) + sort (TVL / Yield / Risk).

---

### PAGE 4 — Create Vault (`/vaults/create`)
**Status: STUB — BUILD AFTER PAGE 3**

4-step wizard with progress bar.

**Step 1 — Name**
- Vault name input
- Vault description (optional)

**Step 2 — Strategy**
- 4 cards: Conservative / Balanced / Growth / Custom
- Each card shows typical allocation breakdown
- Selecting one pre-fills Step 3 defaults

**Step 3 — Objective**
- Multi-select pills:
  - Maximize Yield
  - Preserve Capital
  - Support Builders
  - AI Sector Exposure
  - Prediction Alpha

**Step 4 — Risk + Deploy**
- Risk tolerance slider (1–10)
- Initial deposit input (cGEN)
- Summary panel
- "Create Vault" button → calls VaultManager.create_vault()

---

### PAGE 5 — Vault Detail (`/vaults/[id]`)
**Status: STUB — BUILD AFTER PAGE 4**

Most important page. Reads from VaultManager contract.

**Left column (2/3 width):**

Overview strip: Treasury Size / 30d Yield / Risk Level / Vault Age

Current Allocation:
- Donut chart (Recharts) — 4 segments
- Breakdown list below: % + absolute cGEN amount per market

AI Council panel:
- 4 cards in a 2x2 grid
- Members: Risk Analyst / Yield Analyst / Macro Analyst / Liquidity Analyst
- Each shows their latest stated opinion (from contract)
- Last updated timestamp

Allocation History:
- Timeline / area chart (Recharts) showing allocation shifts over time

Decision History:
- Scrollable list of every on-chain decision
- Each entry: action / reason / timestamp / market affected

**Right column (1/3 width):**
- Deposit panel (amount input + "Deposit" CTA)
- Withdraw panel (amount input + "Withdraw" CTA)
- Your position: balance + % of vault
- Vault health indicator

---

### PAGE 6 — Lending Market (`/lending`)
**Status: STUB**

Split view: left = loan request form, right = active loans list.

**Loan Request Form:**
- Amount (cGEN, with max based on rGEN score)
- Duration (7 / 14 / 30 / 60 days)
- Purpose (dropdown: Personal, Project, Research, Business)
- Description (textarea — this feeds GenLayer AI evaluation)
- Submit → calls LendingMarket.request_loan()

**After submission — AI Result panel slides in:**
- Approved / Rejected / Counter-offer badge
- Offered interest rate
- AI reasoning (full text from contract)
- Risk score (1–100 gauge)
- If approved: "Accept Loan" CTA

**Active Loans list (right panel):**
- Each loan: borrower, amount, rate, due date, status
- Repay CTA for borrower's own loans

---

### PAGE 7 — Builder Funding (`/builders`)
**Status: STUB**

Two tabs: "Browse Projects" and "Submit Project".

**Browse Projects tab:**
- Card grid of funded/pending projects
- Each card: project name / description excerpt / funding amount / status / repayment progress

**Submit Project tab (form):**
- Project Name
- Description (textarea — AI reads this)
- Funding Requested (cGEN)
- Expected Outcome (textarea)
- Timeline (weeks, slider)
- Team rGEN score (auto-filled from wallet)
- Submit → calls BuilderFunding.submit_project()

**After submission — AI decision panel:**
- Funded / Rejected / Partially Funded badge
- Amount allocated (if partial)
- AI reasoning text
- Conditions (if any)

---

### PAGE 8 — Prediction Markets (`/predictions`)
**Status: STUB**

**Active Markets list:**
- Card per market: question / expiry / total staked / current odds
- "Stake YES / Stake NO" actions

**Create Market form:**
- Question (text input, e.g. "Will ETH exceed 5000 by Q3?")
- Resolution date
- Minimum stake
- Submit → calls PredictionMarkets.create_market()

**Resolved Markets:**
- Past markets with outcomes

---

### PAGE 9 — Reputation (`/reputation`)
**Status: STUB**

User profile page.

**Header:**
- Wallet address (truncated)
- rGEN score — large display with ring gauge
- cGEN balance

**Score Breakdown:**
- Loan History score component
- Funding History score component
- Prediction Accuracy score component
- Vault Performance score component

**Activity History:**
- Tabbed: Loans / Funding / Predictions / Vaults
- Each tab lists relevant history from contracts

**cGEN Faucet:**
- Claim button (disabled if < 24h since last claim)
- Next claim countdown

---

## GenLayer Contracts

### Contract Architecture — 6 Split Contracts (Best Practices)

Each contract is a separate `.py` file in `/contracts/`.
Each deployed independently. Addresses stored in `/src/lib/contracts.ts`.

---

### Contract 1 — `VaultManager.py`

Storage:
```python
vaults: TreeMap[str, Vault]
user_vaults: TreeMap[str, DynArray[str]]
vault_counter: u256
```

Vault dataclass:
```python
@allow_storage
@dataclass
class Vault:
    id: str
    name: str
    owner: str
    strategy: str
    objective: str
    risk_tolerance: u256
    treasury: u256
    allocation_lending: u256
    allocation_staking: u256
    allocation_predictions: u256
    allocation_builders: u256
    created_at: str
    last_rebalance: str
    total_yield: u256
    personality: str
```

Key methods:
- `create_vault(name, strategy, objective, risk, personality) → str` — `@gl.public.write`
- `deposit(vault_id)` — `@gl.public.write.payable`
- `withdraw(vault_id, amount)` — `@gl.public.write`
- `rebalance_vault(vault_id)` — `@gl.public.write` with LLM (Equivalence Principle)
- `get_vault / get_all_vaults / get_user_vaults / get_total_tvl` — `@gl.public.view`

LLM in rebalance uses `gl.eq_principle.prompt_non_comparative` — copies vault storage to locals first.

---

### Contract 2 — `LendingMarket.py`

Storage:
```python
loans: TreeMap[str, Loan]
user_loans: TreeMap[str, DynArray[str]]
loan_counter: u256
total_borrowed: u256
```

Loan dataclass includes: id, borrower, amount, interest_rate (bps), duration_days, purpose, description, status, ai_reasoning, risk_score, timestamps.

Key methods:
- `request_loan(amount, duration_days, purpose, description) → str` — LLM evaluates, writes decision
- `repay_loan(loan_id)` — `@gl.public.write.payable`
- `get_loan / get_user_loans / get_all_active_loans / get_total_borrowed` — views

---

### Contract 3 — `BuilderFunding.py`

Storage:
```python
projects: TreeMap[str, Project]
project_counter: u256
```

Project dataclass: id, applicant, name, description, funding_requested, funding_allocated, expected_outcome, timeline_weeks, status, ai_reasoning, timestamps.

Key methods:
- `submit_project(name, description, funding_requested, expected_outcome, timeline_weeks) → str` — LLM decides fund/reject/partial
- `repay_funding(project_id)` — `@gl.public.write.payable`
- `get_project / get_all_projects / get_user_projects` — views

---

### Contract 4 — `PredictionMarkets.py`

Storage:
```python
markets: TreeMap[str, Market]
stakes: TreeMap[str, TreeMap[str, Stake]]
market_counter: u256
```

Market dataclass: id, creator, question, resolution_date, total_yes, total_no, status, outcome, created_at.
Stake dataclass: position (yes/no), amount.

Key methods:
- `create_market(question, resolution_date) → str` — `@gl.public.write`
- `stake(market_id, position)` — `@gl.public.write.payable`
- `resolve_market(market_id)` — LLM evaluates outcome
- `get_market / get_all_markets / get_user_stakes` — views

---

### Contract 5 — `EconomicEvents.py`

Storage:
```python
events: DynArray[EconomicEvent]
active_event_idx: u256
has_active_event: bool
```

EconomicEvent dataclass: id, event_type, name, description, impact, severity, triggered_at, triggered_by, is_active.

Event types: `bull_market` / `credit_crunch` / `liquidity_crisis` / `ai_boom` / `protocol_exploit`

Key methods:
- `trigger_event(event_type, name, description) → str` — LLM writes impact + severity
- `resolve_event(event_id)` — marks inactive
- `get_active_event / get_all_events / get_event_history` — views

---

### Contract 6 — `ReputationSystem.py`

Storage:
```python
scores: TreeMap[str, ReputationScore]
history: TreeMap[str, DynArray[ReputationEvent]]
faucet_claims: TreeMap[str, str]
```

ReputationScore dataclass: address, total_score (rGEN), loan_score, funding_score, prediction_score, vault_score, total_actions.

Key methods:
- `record_loan_repayment(borrower, on_time)` — awards/deducts rGEN
- `record_funding_repayment(applicant, success)`
- `record_prediction_outcome(user, correct)`
- `claim_cgen()` — faucet with 24h cooldown check
- `get_score / get_history / can_claim_faucet` — views

---

## Frontend Contract Integration

### `/src/lib/contracts.ts`
```ts
export const CONTRACTS = {
  VaultManager:      "0x...",
  LendingMarket:     "0x...",
  BuilderFunding:    "0x...",
  PredictionMarkets: "0x...",
  EconomicEvents:    "0x...",
  ReputationSystem:  "0x...",
} as const
```
Fill addresses after deployment.

### `/src/lib/genlayer.ts`
Client factory with `getClient()`, `readContract()`, `writeContract()` helpers.
Use `genlayer-js` with `simulator` chain from `genlayer-js/chains`.
Imports: `createClient` from `genlayer-js`, `TransactionStatus` from `genlayer-js/types`.

### Zustand Store Structure
```
src/store/
  useWalletStore.ts
  useVaultStore.ts
  useLendingStore.ts
  useBuilderStore.ts
  usePredictionStore.ts
  useEventStore.ts
```

---

## Shared Components to Build

```
src/components/
  Nav.tsx                ✅ BUILT
  Sidebar.tsx            — dashboard sidebar (pages 2–9)
  PageLayout.tsx         — wrapper with sidebar for inner pages
  StatCard.tsx           — metric card with animated counter
  VaultCard.tsx          — vault display card
  DecisionItem.tsx       — single AI decision row
  AllocationDonut.tsx    — Recharts donut, 4-segment
  EventBanner.tsx        — active economic event banner
  AIReasoningBox.tsx     — styled AI reasoning text block
  RiskGauge.tsx          — circular gauge for risk/rGEN score
  AnimatedCounter.tsx    — number count-up on viewport entry
  landing/               ✅ ALL BUILT
    Hero.tsx
    HowItWorks.tsx
    EcosystemCards.tsx
    DecisionFeed.tsx
    Footer.tsx
```

---

## Build Order

1. ✅ PAGE 1 — Landing
2. 🔄 Contracts (all 6) — in parallel with PAGE 2
3. 🔄 Shared components (Sidebar, PageLayout, StatCard, AllocationDonut, AnimatedCounter, EventBanner)
4. ⏳ PAGE 2 — Ecosystem Dashboard
5. ⏳ PAGE 3 — Vault Marketplace
6. ⏳ PAGE 4 — Create Vault
7. ⏳ PAGE 5 — Vault Detail
8. ⏳ PAGE 6 — Lending Market
9. ⏳ PAGE 7 — Builder Funding
10. ⏳ PAGE 8 — Prediction Markets
11. ⏳ PAGE 9 — Reputation

---

## Key Rules — Every Session

1. **Read CLAUDE.md first.** Do not skip.
2. **Design system is law.** Navy/charcoal/cyan. Kastle layout. Taste Labs motion. Sui colors.
3. **Never fake contract calls without labelling.** Use `MOCK_*` constants only until contracts deploy.
4. **Ask before assets.** No illustrations, backgrounds, or custom icons without user approval.
5. **Framer Motion on everything.** Section reveals, card hovers, page transitions, counters.
6. **One contract per domain.** Never monolithic.
7. **GenLayer best practices.** Non-det blocks use locals only. Typed generics everywhere. Mix `@gl.public.write`, `@gl.public.write.payable`, and LLM writes in each contract.
8. **Dev server runs on port 3002.** Do not change the port.
