# Compax — The Operating System for Autonomous Capital

**An economy that thinks before it moves.**

Compax is an autonomous treasury operating system built on [GenLayer](https://genlayer.com) Bradbury testnet. Users state an objective; GenLayer intelligent contracts reason over live market data and continuously reallocate capital across lending, staking, builder funding, and prediction markets — writing every decision onchain with its reasoning attached.

This is not a demo. It is a functioning Bradbury testnet application. The intelligent contract is the portfolio manager.

**Live app**: https://compax-sepia.vercel.app · **Testing guide**: [TESTING.md](TESTING.md) · **Portal submission details**: [SUBMISSION.md](SUBMISSION.md)

---

## The Thesis

1. **State an objective** — a mandate, not a position. *"Grow this treasury toward steady income with moderate risk."*
2. **Five validators deliberate** — each intelligent contract call is independently evaluated by five GenLayer validators (`gl.eq_principle.prompt_non_comparative`) before consensus is reached and state is written.
3. **Capital moves, onchain** — every rebalance, loan decision, funding evaluation, and reputation update is recorded with the reasoning and the live market data (CoinGecko prices, Fear & Greed index) that informed it.
4. **The vault manager can act on its own** — a registered keeper (`keeper/cycle.mjs`) can trigger a vault's reallocation without a human present. The keeper decides nothing and cannot move funds; it only asks the contract to reason.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPAX FRONTEND                          │
│         Next.js 16 (Turbopack) · React 19 · App Router       │
│    Archivo / JetBrains Mono / Instrument Serif · dark theme  │
├─────────────────────────────────────────────────────────────┤
│                      HOOKS LAYER                              │
│      useContract.ts — typed reads/writes per contract         │
├─────────────────────────────────────────────────────────────┤
│                 CLIENT-SIDE SIGNING                            │
│  src/lib/genlayer.ts — genlayer-js + any EIP-6963 wallet      │
│    Every write is signed by the user's own wallet.            │
├─────────────────────────────────────────────────────────────┤
│              GENLAYER BRADBURY TESTNET                         │
│                                                                │
│  VaultManager   LendingMarket   BuilderFunding                │
│  PredictionMarkets   ReputationSystem   EconomicEvents         │
│  StakingReserve                                                │
└─────────────────────────────────────────────────────────────┘
```

There is no server-side relayer or backend API route — writes are signed directly by the connected wallet via `genlayer-js`, targeting Bradbury (chainId `4221`) at `https://rpc-bradbury.genlayer.com`.

The autonomous keeper (`keeper/cycle.mjs`) is a separate, optional process: it holds its own registered keeper key, reads every vault under management, and calls `rebalance_vault` on each — the same write path a human owner would use, just triggered on a schedule instead of a click.

### 7 Intelligent Contracts

Every contract uses `gl.eq_principle.prompt_non_comparative` (or `strict_eq` for raw data fetches) so validators reach consensus through reasoning, not just computation.

| Contract | Purpose | AI Decision |
|----------|---------|-------------|
| **VaultManager** | Autonomous treasuries with stated objectives | Initial allocation at creation, and every rebalance across lending/staking/predictions/builders — using live CoinGecko + Fear & Greed data |
| **LendingMarket** | Credit priced by market conditions | Approve/reject loans, set interest rate, assess risk score |
| **BuilderFunding** | Milestone-gated ecosystem funding | Evaluate proposals, allocate partial/full funding |
| **PredictionMarkets** | Questions contracts can resolve | Resolve binary markets with reasoned outcomes |
| **ReputationSystem** | Score tracking across all sectors | Weighs the severity/context of each outcome to set the score delta, not a fixed constant |
| **EconomicEvents** | System-wide event propagation | Assesses event severity and impact guidance |
| **StakingReserve** | The reserve backing `allocation_staking` | Assigns per-position yield band + validator tier from live market context |

All 7 contracts are independent — none take constructor arguments and none call each other. Current addresses live in [`src/lib/contracts.ts`](src/lib/contracts.ts).

---

## Liquidity & settlement

Every write that should move real value actually moves real value — no contract silently pretends to disburse or repay. That took two separate fixes to get right, worth explaining honestly rather than glossing over.

### How a payout actually happens

Sending native GEN out of a GenLayer intelligent contract isn't automatic — it requires declaring a small interface stub and calling a transfer through it:

```python
@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass

# ...inside a write method:
_Recipient(Address(recipient_address)).emit_transfer(value=u256(amount))
```

This is GenLayer's documented pattern for sending to an externally-owned address ([Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers)) — an early draft of `VaultManager.withdraw` called this without declaring the interface first, which is a plain `NameError`, not a platform limitation. Once verified against the docs and fixed, four methods now use it for real payouts, and each is bounds-checked so it can only ever send value the contract is actually holding:

| Method | Pays out | Bounded by |
|---|---|---|
| `VaultManager.withdraw` | A depositor's withdrawal | That vault's own tracked treasury (sum of its deposits) |
| `StakingReserve.unstake` | A staker's principal | That position's staked amount |
| `PredictionMarkets.claim_winnings` | A winner's stake + proportional share of the losing pool | Total staked on both sides of that market |
| `LendingMarket.request_loan` / `BuilderFunding.submit_project` | An approved loan or grant | The contract's own pool balance (`get_pool_balance`) — see below |

### The cGEN pool: what it is and why

`LendingMarket` and `BuilderFunding` don't hold value because users deposited it (unlike vaults, staking, or prediction markets) — someone has to put capital in before the AI can approve anything against it. Since Bradbury is testnet and Compax controls the deployer account, both contracts have a `fund_pool()` method, owner-gated, that lets us top them up with real testnet GEN. Both pools were seeded with 100,000 cGEN on deploy.

The disbursement logic is a **solvency gate**, not a suggestion: the AI evaluates a loan or proposal on its merits exactly as before, but the contract itself checks `int(self.balance)` against the requested amount right before recording the decision. If the pool can't cover what was approved, the stored outcome is downgraded — a would-be "approved" loan becomes "rejected," a would-be "funded" grant becomes "partial" or "rejected" — so what's written onchain always matches what was actually paid out. Nothing is ever recorded as approved with no capital behind it.

```python
pool_balance = int(self.balance)
if approved and _amount > pool_balance:
    approved = False   # AI said yes, pool says no — pool wins
```

### What this is honestly — and isn't

This is a correct, solvency-safe settlement layer for a **testnet demonstration**. It is not yet a decentralized lending market, and calling it one on mainnet would be misleading. Specifically, as of this design:

- **The pool is centralized.** It's funded by one owner-controlled EOA, not by permissionless liquidity providers who earn yield for supplying capital. On mainnet, "the pool" would just be the team's money, not a market.
- **Loans are unsecured, with no enforced consequence for default.** `repay_loan` and `repay_funding` are voluntary — nothing locks collateral, and nothing liquidates or penalizes a borrower who simply never calls them. `ReputationSystem` could reflect a default, but that call isn't wired anywhere yet (no contract in this app calls another contract).
- **Interest is decorative right now.** `LendingMarket` stores an AI-set `interest_rate_bps` per loan, but `repay_loan` only requires repaying the principal (`repay_value >= l["amount"]`) — the rate isn't actually collected. It reads as real APR in the UI; today it isn't charged.
- **Rates aren't market-derived.** The AI sets a rate/allocation per request by reasoning over live market data, not from a supply/utilization curve the way a real money market (Aave-style) prices credit.

### What would need to change for mainnet

In rough order of how load-bearing they are:

1. **Collateral or enforceable credit risk.** Either require locked collateral (over-collateralized, standard DeFi pattern) or build real recourse for under-collateralized lending — automatic reputation slashing, a liquidation path, or both. Reasoning about risk is not the same as bearing consequences for being wrong.
2. **Actually collect interest.** `repay_loan` needs to require principal + accrued interest, not just principal, and that interest needs to flow somewhere — back into the pool (compounding it for future borrowers) is the simplest version.
3. **Decentralize the pool.** Replace the single owner `fund_pool()` with permissionless LP deposits that mint a claim on the pool (a share, not a fixed loan), with yield distributed from collected interest. This turns "the pool" into an actual market instead of a treasury we personally top up.
4. **Wire the reputation loop.** `ReputationSystem.record_loan_repayment` / `record_funding_repayment` exist and already reason about severity — they just need to actually be called (from a keeper, or from the repay/default path itself) so reputation reflects real behavior automatically instead of never firing.
5. **Rate curves, not rate guesses.** Once there's real utilization (pool borrowed / pool supplied), rates should respond to that mechanically, with the AI's live-market reasoning as a secondary adjustment on top — not the sole input.
6. **An actual audit.** None of this has been reviewed by anyone but the person who wrote it. Before real value touches any of these contracts, that has to happen.

None of this is a criticism of the current build for what it's for — it's an accurate settlement layer for a testnet demo of AI-reasoned finance, and every payout it makes is provably bounded by real value the contract holds. It just isn't, and shouldn't be presented as, a production lending protocol yet.

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing — the Terminal (product UI as hero), how it works, validator consensus, four sectors |
| `/ecosystem` | Overview — network-wide TVL, allocation, vaults, prediction markets, event feed |
| `/vaults` | Vault marketplace — browse and create vaults |
| `/vaults/create` | Create a vault — name, strategy, objective, risk tolerance |
| `/vaults/[id]` | Vault detail — Brain (last decision + active event), Treasury (allocation + metadata), History (every rebalance, expandable) |
| `/lending` | Request a loan — AI evaluates approval, rate, and risk |
| `/builders` | Submit a funding proposal — AI evaluates fund/reject/partial |
| `/predictions` | Create and stake on prediction markets |
| `/staking` | Reserve composition, yield tiers |
| `/reputation` | Score, sector breakdown, action timeline |
| `/faucet` | One-time cGEN claim |

---

## Design Language

Institutional, dark by default (`[data-theme="light"]` override available).

- **Typography**: Archivo (UI), JetBrains Mono (data/labels), Instrument Serif italic (reasoning/objective quotes)
- **Color**: Ground `#070F12`, Primary `#00C27A`, Signal `#5FE3A8`, Amber `#E8A33D`, Clay `#E0654A`
- **Motion**: Lenis smooth scroll + `Reveal`/`RevealGroup`/`RevealItem` (rise + fade, staggered)
- **Consensus glyph**: only ever renders a state we actually know — `ACCEPTED` (five validators agreed, real chain semantics) or an unresolved/deliberating state. It never fabricates a per-validator vote breakdown, since no contract exposes one.

---

## Getting Started (local dev)

### Prerequisites

- Node.js 18+
- A GenLayer Bradbury testnet account with cGEN, and MetaMask configured for chainId `4221`

### Install & Run

```bash
npm install
npm run dev
```

Writes are signed by whatever wallet the user connects in the browser — no server-side key is needed to run the frontend locally.

### Optional: the autonomous keeper

The keeper is a separate script, not required for the frontend:

```bash
cp deploy/.env.example deploy/.env   # if present, else create deploy/.env
# deploy/.env:
#   ACCOUNT_PRIVATE_KEY=0x...        # a GenLayer account registered as a keeper via add_keeper

npm run keeper:dry     # one cycle, no writes
npm run keeper         # one cycle
npm run keeper:loop    # runs forever, every INTERVAL_MIN (default 30)
```

`deploy/.env` and `.env.local` are gitignored — never commit a private key.

### Redeploying contracts

```bash
node deploy/deploy.mjs                # deploy all 7 fresh
node deploy/redeploy-fixed.mjs        # redeploy VaultManager + ReputationSystem only
```

See [`contracts/deploy_order.md`](contracts/deploy_order.md). After any deploy, update the addresses in `src/lib/contracts.ts`.

---

## Deploying to production (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. No environment variables are required for the frontend itself — all reads and writes happen client-side against Bradbury.
3. Set `NEXT_PUBLIC_SITE_URL` to the app's production URL (used for OpenGraph/Twitter metadata in `src/app/layout.tsx`).
4. If running the keeper as a scheduled job (e.g. a cron worker, not on Vercel's edge), keep `ACCOUNT_PRIVATE_KEY` in that worker's own secret store — it is never read by the Next.js app.
5. `next.config.ts` sets baseline security headers (CSP, X-Frame-Options, etc.) for all routes.

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Turbopack
- **Chain**: GenLayer Bradbury Testnet
- **Client SDK**: `genlayer-js`
- **Fonts**: Archivo, JetBrains Mono, Instrument Serif (Google Fonts via `next/font`)
- **Motion**: Framer Motion, Lenis

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx               # Landing
│   ├── ecosystem/page.tsx     # Overview
│   ├── vaults/
│   │   ├── page.tsx           # Marketplace
│   │   ├── create/page.tsx    # Create Vault
│   │   └── [id]/page.tsx      # Vault Detail
│   ├── lending/page.tsx
│   ├── builders/page.tsx
│   ├── predictions/page.tsx
│   ├── staking/page.tsx
│   ├── reputation/page.tsx
│   ├── faucet/page.tsx
│   ├── error.tsx               # Route-level error boundary
│   ├── not-found.tsx           # 404
│   └── global-error.tsx        # Root layout crash fallback
├── components/compax/
│   ├── AppShell.tsx            # Rail nav, degraded banner
│   ├── Terminal.tsx            # Hero — the product UI itself
│   ├── Allocation.tsx          # AllocationPanel
│   ├── Engine.tsx              # EngineFingerprint, ConsensusGlyph
│   ├── DecisionRecord.tsx      # Expandable rebalance history row
│   ├── TxStatus.tsx            # Deliberation readout for in-flight writes
│   ├── Reveal.tsx              # Scroll-entrance system
│   ├── SmoothScroll.tsx        # Lenis
│   └── primitives.tsx          # PageHead, StatTile, Panel, EmptyState, Tag
├── hooks/
│   ├── useContract.ts          # Typed hooks for all 7 contracts
│   └── useWallet.ts            # EIP-6963 multi-wallet connect/chain-switch/account tracking
├── lib/
│   ├── contracts.ts            # Deployed contract addresses
│   ├── genlayer.ts             # Read/write client wrappers (client-side signing)
│   └── walletProviders.ts      # EIP-6963 wallet discovery
contracts/
├── VaultManager.py
├── LendingMarket.py
├── BuilderFunding.py
├── PredictionMarkets.py
├── ReputationSystem.py
├── EconomicEvents.py
├── StakingReserve.py
└── deploy_order.md
keeper/
└── cycle.mjs                   # Autonomous allocation heartbeat
deploy/
├── deploy.mjs                  # Deploy all 7 contracts
├── redeploy-fixed.mjs          # Redeploy VaultManager + ReputationSystem
├── redeploy-settlement.mjs     # Redeploy VaultManager + StakingReserve + PredictionMarkets
└── redeploy-liquidity.mjs      # Redeploy + fund LendingMarket + BuilderFunding pools
```

---

Built on [GenLayer](https://genlayer.com) — the blockchain for intelligent contracts.
