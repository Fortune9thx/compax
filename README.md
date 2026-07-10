# Compass — The Operating System for Autonomous Capital

**An economy that thinks before it moves.**

Compass is an autonomous financial operating system built on [GenLayer](https://genlayer.com) Bradbury testnet. It replaces static DeFi dashboards with AI-governed treasuries that reason, allocate, and adapt — writing every decision onchain with full lineage.

This is not a yield aggregator. This is not a portfolio tracker. Compass is what happens when capital has a brain.

---

## The Thesis

DeFi today is reactive. Users chase yield, manage risk manually, and trust opaque algorithms. Compass inverts this model:

1. **State an objective** — not a position, not a trade. A mandate. *"Grow this treasury toward steady income with moderate risk over 12 months."*
2. **A council reasons** — four AI analysts (Risk, Yield, Liquidity, Macro) deliberate on GenLayer's intelligent contract layer. They argue, dissent, and reach consensus — in public, forever.
3. **Capital moves** — allocation shifts based on reasoning, not signals. Every rebalance, every loan decision, every funding vote is recorded onchain with the full argument preserved.
4. **The record grows** — reputation is sediment, not a score. Every action deposits a layer. Dissent is preserved alongside consensus. Nothing is hidden.

The key insight: **the reasoning IS the product**. Not the yield. Not the APY. The fact that you can read exactly why capital moved, who argued for it, who dissented, and what the system learned.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPASS FRONTEND                         │
│            Next.js 16 · React 19 · App Router               │
│     IBM Plex Sans/Mono · Newsreader · Void/Panel theme      │
├─────────────────────────────────────────────────────────────┤
│                   HOOKS LAYER                               │
│     useContract.ts — typed reads/writes per contract         │
│     Sequential RPC calls (Bradbury rate limit aware)         │
├─────────────────────────────────────────────────────────────┤
│                 API ROUTE (/api/write)                       │
│     Server-side signing · DEMO_PRIVATE_KEY · Never exposed   │
├─────────────────────────────────────────────────────────────┤
│              GENLAYER BRADBURY TESTNET                       │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ VaultManager │  │ LendingMarket│  │ BuilderFunding│      │
│  │              │  │              │  │               │      │
│  │ create_vault │  │ request_loan │  │submit_project │      │
│  │ deposit      │  │ repay_loan   │  │repay_funding  │      │
│  │ withdraw     │  │              │  │               │      │
│  │ rebalance    │  │              │  │               │      │
│  └──────────────┘  └──────────────┘  └───────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │PredictionMkts│  │ Reputation   │  │EconomicEvents│      │
│  │              │  │   System     │  │              │      │
│  │ create_market│  │ get_score    │  │trigger_event │      │
│  │ stake        │  │ get_history  │  │resolve_event │      │
│  │resolve_market│  │ claim_cgen   │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 6 Intelligent Contracts

Every contract uses GenLayer's `eq_principle.prompt_non_comparative` for AI-powered decision making — validators reach consensus through reasoning, not just computation.

| Contract | Purpose | AI Decision |
|----------|---------|-------------|
| **VaultManager** | Autonomous treasuries with stated objectives | Rebalance allocation across lending/staking/predictions/builders |
| **LendingMarket** | Credit priced by reputation | Approve/reject loans, set interest rates, assess risk |
| **BuilderFunding** | Milestone-gated ecosystem funding | Evaluate proposals, allocate partial/full funding |
| **PredictionMarkets** | Questions contracts can resolve | Resolve binary markets with reasoned outcomes |
| **ReputationSystem** | Sediment-based reputation tracking | Score actions across loan/funding/prediction/vault categories |
| **EconomicEvents** | System-wide event propagation | Analyze event severity and impact guidance |

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — value prop, Capital Engine SVG, AI Council feed |
| `/ecosystem` | Economy Map — live SVG circuit of all capital flows between vaults, markets, and the record |
| `/vaults` | Vault Marketplace — filter by objective class and risk posture, create new vaults |
| `/vaults/create` | Create Vault — sentence composer for objective, constraint builder, council preview, dry-run simulation |
| `/vaults/[id]` | Vault Detail — Brain (council chamber), Treasury (allocation engine SVG), History (rebalance record) |
| `/lending` | Lending Market — sentence-based loan request, live AI council evaluation, open book |
| `/builders` | Builder Funding — proposal cards, submission form, AI council review |
| `/predictions` | Prediction Markets — question cards with YES/NO weight bars, resolution with verbatim reasoning |
| `/reputation` | Reputation — strata band visualization, council reading, action timeline |

---

## Design Language

Institutional sans-first. Bloomberg meets Palantir meets Vision Pro.

- **Typography**: IBM Plex Sans (300–600, leads everything), IBM Plex Mono (data/labels), Newsreader italic (reasoning accent — agent quotes, objectives only)
- **Color**: Void `#070A12`, Panel `#0A0F1A`, Reason cyan `#7FD4D4` (reserved — never decorative), Green `#6FBF8F` (yield/agreement), Amber `#D6926A` (risk/dissent)
- **Motion**: `ceFlow` (circuit stroke animation), `cePulse` (live indicators), `ceScan` (brain scanline), `ceDrift` (ticker), `ceRise` (400ms content reveal)
- **No spinners**: Council thinking dots only. No loading bars. No skeleton screens. The system either knows or it's reasoning.

---

## Getting Started

### Prerequisites

- Node.js 18+
- GenLayer Bradbury testnet account with cGEN

### Install & Run

```bash
npm install
cp .env.example .env.local
# Add your DEMO_PRIVATE_KEY to .env.local
npm run dev
```

### Environment

```env
DEMO_PRIVATE_KEY=0x...  # GenLayer account private key for write operations
```

### Deployed Contracts (Bradbury Testnet)

```
EconomicEvents:    0x5a9AeE83e082fE87742e0a8d8105888d192e96c9
ReputationSystem:  0x6e03d11d9427E0Dc2cA4Ec06FC19537c20aD1027
LendingMarket:     0xD28e774e77fa01Ce0bF42E82Dd899De3E90a7e0a
BuilderFunding:    0x003Ba87D5FC79653FEC4E75Af234BB5495193200
PredictionMarkets: 0xD708C9e308C7eeb2788218470175BD96f4fB9D84
VaultManager:      0xd167F20348ff191E119D974FfaD746dBE052c51a
```

---

## What Makes This Different

### vs. Traditional DeFi Dashboards
Traditional dashboards show you numbers. Compass shows you *why* those numbers exist. Every allocation shift comes with a recorded argument. Every loan decision comes with AI reasoning preserved onchain. You don't trust the algorithm — you read its argument and decide for yourself.

### vs. AI Trading Bots
Bots optimize for a signal. Compass reasons about an objective. The difference: a bot buys low and sells high. A council argues whether "low" means opportunity or regime change, records the dissent, and lets the mandate decide. The reasoning is the audit trail.

### vs. DAOs
DAOs vote. Compass argues. A DAO proposal is a binary yes/no. A Compass decision is a four-way debate where dissent is preserved alongside consensus. The system doesn't just record what happened — it records what was considered and rejected.

---

## Future Directions

### Near-term (Bradbury → Production)
- **Multi-wallet support** — connect any GenLayer wallet, track per-depositor balances, personal reputation
- **Real-time event streaming** — WebSocket subscriptions for live council deliberations and rebalance events
- **Cross-vault arbitrage** — councils can propose capital movements between vaults when objectives align
- **Richer reputation strata** — time-weighted decay, category-specific trust levels, cross-protocol reputation imports

### Medium-term
- **Council customization** — deploy vaults with custom analyst mandates (ESG analyst, sector specialist, volatility trader)
- **Delegation markets** — delegate your capital to a vault's objective, earn yield proportional to the council's performance
- **Governance layer** — REP-weighted governance for protocol-level decisions (fee structures, new contract deployments, parameter changes)
- **Mobile companion** — push notifications for council deliberations affecting your positions, one-tap approve/dissent

### Long-term Vision
- **Autonomous economic zones** — multiple Compass instances forming a network of reasoning economies, where capital flows between zones based on cross-council agreements
- **Institutional-grade audit trails** — compliance-ready decision records that satisfy regulatory requirements through transparent AI reasoning
- **Protocol-level intelligence** — GenLayer validators learning from historical decisions to improve consensus quality over time
- **The Compass Standard** — an open specification for "reasoned capital management" that other protocols can adopt, creating a shared language for AI-governed finance

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Turbopack
- **Chain**: GenLayer Bradbury Testnet
- **Client SDK**: `genlayer-js`
- **Fonts**: IBM Plex Sans, IBM Plex Mono, Newsreader (Google Fonts via next/font)
- **Design**: Inline styles, CSS custom properties, zero component libraries

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing
│   ├── ecosystem/page.tsx    # Economy Map
│   ├── vaults/
│   │   ├── page.tsx          # Marketplace
│   │   ├── create/page.tsx   # Create Vault
│   │   └── [id]/page.tsx     # Vault Detail
│   ├── lending/page.tsx      # Lending Market
│   ├── builders/page.tsx     # Builder Funding
│   ├── predictions/page.tsx  # Prediction Markets
│   ├── reputation/page.tsx   # Reputation System
│   └── api/write/route.ts    # Server-side contract writes
├── components/compass/
│   └── ui.tsx                # Shared primitives
├── hooks/
│   └── useContract.ts        # Typed hooks for all 6 contracts
├── lib/
│   ├── contracts.ts          # Deployed contract addresses
│   └── genlayer.ts           # Read/write client wrappers
contracts/
├── VaultManager.py
├── LendingMarket.py
├── BuilderFunding.py
├── PredictionMarkets.py
├── ReputationSystem.py
└── EconomicEvents.py
```

---

Built on [GenLayer](https://genlayer.com) — the blockchain for intelligent contracts.
