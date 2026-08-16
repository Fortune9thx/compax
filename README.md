# Compax - The Adjudication Layer for Autonomous Capital

**Multi-party capital, adjudicated by consensus, under natural-language mandates.**

Compax is a GenLayer intelligent-contract platform on Bradbury testnet. Capital is locked against natural-language success criteria; five GenLayer validators independently fetch live web evidence and evaluate submitted proof, reaching consensus to release, partially release, claw back, or split that capital - with the full reasoning and the data that informed it written onchain, and GenLayer's native appeal window available before anything finalizes.

This is not a demo, and it is not a portfolio-rebalancing app. Every capital-moving decision here requires judgment over contested, real-world evidence.

**Live app**: https://compax-sepia.vercel.app · **Testing guide**: [TESTING.md](TESTING.md) · **Portal submission**: [SUBMISSION.md](SUBMISSION.md)

---

## The Thesis

1. **Lock capital under a natural-language mandate** - a performance escrow's success criteria, a prediction market's question, a credit line's collateral and purpose.
2. **Evidence is submitted, and it can be challenged** - a provider submits proof; anyone can post a bond and contest it before it resolves.
3. **Five validators adjudicate, not rubber-stamp** - `resolve()` fetches live web data itself and reasons fresh from the original mandate, weighing evidence and any challenge. In testing, this genuinely produced outcomes that disagreed with what was proposed - see [SUBMISSION.md](SUBMISSION.md) for the actual transcripts.
4. **Reputation only updates from adjudicated outcomes** - never self-reported, and pulled from the resolved instrument's own onchain state, not pushed blindly.
5. **The keeper triggers, never decides** - an optional autonomous process asks overdue escrows/markets to resolve themselves. It cannot move funds and cannot influence the outcome.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPAX FRONTEND                          │
│    Next.js 16 (Turbopack) · React 19 · Tailwind CSS v4      │
│         Archivo / JetBrains Mono / Instrument Serif          │
├─────────────────────────────────────────────────────────────┤
│                 CLIENT-SIDE SIGNING                            │
│  src/lib/genlayer.ts - genlayer-js + any EIP-6963 wallet      │
│    Every write is signed by the user's own wallet.            │
├─────────────────────────────────────────────────────────────┤
│              GENLAYER BRADBURY TESTNET                         │
│                                                                │
│  ReputationRegistry   EscrowAdjudicator (hero)                │
│  VaultManager   PredictionMarket   CreditLine                 │
└─────────────────────────────────────────────────────────────┘
```

No server-side relayer, no backend API route. Every write is signed client-side by the connected wallet at chainId `4221`.

### 5 Intelligent Contracts

Every capital-moving decision uses `gl.eq_principle.prompt_non_comparative` (LLM reasoning validated by five-validator consensus) grounded in live web data fetched via `gl.eq_principle.strict_eq` + `gl.nondet.web.get`.

| Contract | Purpose | What the AI actually decides |
|---|---|---|
| **EscrowAdjudicator** *(hero)* | Locks capital against natural-language success criteria; a named provider accepts, submits evidence, anyone can challenge | `resolve()` fetches live web data (including the provider's own submitted evidence URL) and decides `full_release` / `partial` / `clawback`, with an exact `released_amount` |
| **PredictionMarket** | Binary markets; anyone proposes an outcome after staking closes, anyone can challenge, the creator cannot self-resolve | `resolve()` independently re-derives the real answer from the question + live data - it can and does disagree with the proposal |
| **VaultManager** | Mandate vaults: multi-party capital pools with individually withdrawable depositor claims; the owner moves capital toward escrow/prediction/credit with a stated justification, which any depositor can challenge | Whether a specific, contested capital movement genuinely complied with the vault's natural-language objective - not which instrument types are allowed, which is a transparent, deterministic risk-tier rule, not an AI decision |
| **CreditLine** | Borrower posts collateral + purpose; a separate lender funds the loan with their own capital (no platform-funded pool); contested defaults are adjudicated | Loan-to-value + interest rate at open; on a contested default, the exact collateral split between lender and borrower |
| **ReputationRegistry** *(redeployed 2026-08-10)* | Pull-based score tracking, only from adjudicated outcomes of the other four contracts | The magnitude of each score delta, weighed by the actual severity of the outcome - not a fixed constant |

All 5 contracts are independent at deploy time - see [`contracts/deploy_order.md`](contracts/deploy_order.md) for why, and how reputation and vault capital-movement actually work as a result. Current addresses: [`src/lib/contracts.ts`](src/lib/contracts.ts).

---

## What was deliberately left out of this version

Cut from an earlier iteration of this app, and not brought back here, because they contradict what GenLayer is actually for:

- Centralized AI-gated lending pools that disburse without an opposing party (a real lender always funds a `CreditLine`, with their own capital)
- Decorative interest that's calculated but never actually collected (`CreditLine.repay` requires principal + interest, checked onchain)
- Contracts that never update reputation (every outcome here is pullable into `ReputationRegistry`)
- Fake "allocation" percentages that never move real capital (`VaultManager` only ever moves capital via a real value transfer, gated on the vault's actual mandate)
- Owner-only market resolution (`PredictionMarket.resolve` is permissionless; the creator cannot force their own proposal through)
- Unsecured, no-recourse lending (`CreditLine` is always collateralized, with real contested-default adjudication)
- AI classification with no counterparty and no external fact to depend on (`VaultManager`'s mandate scope - which instrument types a vault permits - used to run through five-validator LLM consensus for a decision that was actually deterministic; it's now a transparent risk-tier rule, and the real adjudication moved to `resolve_movement()`, where it belongs: a genuinely contested question over a real capital movement)
- Deposits with no individual claim (early `VaultManager` let anyone pay into someone else's vault with only the owner able to ever withdraw; deposits are now tracked per depositor, and every depositor can reclaim their own undeployed capital)

---

## Honest limitations

This is a testnet build, verified end-to-end with real transactions - see [SUBMISSION.md](SUBMISSION.md) for the actual test transcripts - but it has real, documented gaps:

- **No onchain wall-clock.** No contract on this GenVM build has a verified way to check "has this deadline passed" - every timestamp field here is stored as `""`. Deadline enforcement for the keeper happens off-chain, in `keeper/cycle.mjs`, where `Date.now()` is trivially available; the contracts themselves accept `resolve()` whenever evidence/a proposal exists, deadline or not.
- **Cross-contract writes don't work on this GenVM build.** Confirmed twice: a contract calling another contract's write method via `gl.get_contract_at(addr).emit(on=...).method(args)` has its own transaction accepted, but the target's state silently never changes. This is why reputation is pull-based (see `contracts/deploy_order.md`) rather than pushed automatically when an escrow resolves - a party or keeper has to explicitly claim it in a separate transaction.
- **Storage is `TreeMap[str, str]` with JSON values, not typed dataclasses.** `@allow_storage`/`@dataclass` and even plain non-`str` `TreeMap` value types were pilot-tested on this build and silently became permanently unreadable after deploy, despite the deploy transaction itself succeeding. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Amounts are raw integers, not wei-scaled.** A "10,000 cGEN" escrow is `value: 10000n`, not `10000n * 10^18`. Consistent throughout, but worth knowing if you're checking balance deltas.

---

## Roadmap

What a mainnet-ready v3 would need, roughly in order:

1. **A verified onchain wall-clock**, once one exists on GenVM - would let deadlines gate `resolve()`/`propose_outcome()` at the contract level instead of procedurally.
2. **Atomic vault-to-instrument funding**, once cross-contract writes are fixed on this GenVM build - would collapse `move_to_*` + the owner's follow-up create call into one transaction.
3. **More resolution sources per adjudication** - today each `resolve()` fetches one live data source (CoinGecko, or the first submitted evidence URL); a mainnet version would fetch and weigh several independent sources per decision.
4. **A public keeper network** instead of a single operator-run process, so `resolve()`/`resolve_movement()` triggering isn't a single point of reliance.
5. **Broader instrument types** beyond escrow/prediction/credit, using the same adjudication primitives (challenge, permissionless resolve, pull-based reputation) already proven out here.

## Getting Started (local dev)

```bash
npm install
npm run dev
```

No environment variables are required for the frontend - reads and writes both happen client-side against Bradbury. Connect any EIP-6963 wallet (MetaMask, Rabby, Coinbase Wallet, etc.) configured for chainId `4221`.

### Optional: the autonomous keeper

```bash
# deploy/.env:
#   ACCOUNT_PRIVATE_KEY=0x...   # a registered keeper key - see contracts/deploy_order.md

npm run keeper:dry     # one cycle, no writes
npm run keeper         # one cycle
npm run keeper:loop    # runs forever, every INTERVAL_MIN (default 30)
```

`deploy/.env` and `.env.local` are gitignored - never commit a private key.

### Redeploying contracts

```bash
node deploy/deploy.mjs
```

Deploys all 5, verifies each is readable, and registers the trusted-source relationships `ReputationRegistry` needs. Update `src/lib/contracts.ts` with the printed addresses afterward.

---

## Deploying to production (Vercel)

1. Push to GitHub, import in Vercel.
2. No environment variables required - everything is client-side against Bradbury.
3. Optionally set `NEXT_PUBLIC_SITE_URL` for OpenGraph/Twitter metadata.
4. Run the keeper as a separate scheduled job if you want it - its private key never touches the Next.js app.

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Radix UI primitives
- **Chain**: GenLayer Bradbury Testnet (chainId `4221`)
- **Client SDK**: `genlayer-js`
- **Wallet**: EIP-6963 multi-wallet discovery

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                # Dashboard
│   ├── vaults/                 # list, [id], create
│   ├── escrows/                # list, [id], create
│   ├── markets/                # list, [id], create
│   ├── credit/                 # list (fund/repay/default via modal), create
│   ├── reputation/page.tsx     # ReputationPassport
│   ├── history/page.tsx        # Global activity feed
│   ├── settings/page.tsx       # Network, wallet, contract addresses
│   ├── error.tsx · not-found.tsx · global-error.tsx
├── components/
│   ├── deliberation/DeliberationTheater.tsx   # The live consensus UI
│   ├── ui/                     # Button, Card, Badge, Input, Slider, Modal, States
│   └── layout/AppShell.tsx     # Sidebar (desktop) / bottom nav (mobile), wallet control
├── hooks/
│   ├── useContract.ts          # Typed reads/writes for all 5 contracts
│   ├── useDeliberation.ts      # Drives a write through the real GenLayer consensus lifecycle
│   └── useWallet.ts            # EIP-6963 connect/chain-switch/account tracking
├── lib/
│   ├── contracts.ts            # Deployed addresses, network constants
│   ├── genlayer.ts             # Read/write client wrappers
│   └── walletProviders.ts      # EIP-6963 discovery
contracts/
├── interfaces.py                # Reference copy of the _Recipient pattern
├── ReputationRegistry.py
├── EscrowAdjudicator.py         # Hero contract
├── VaultManager.py
├── PredictionMarket.py
├── CreditLine.py
└── deploy_order.md
keeper/
└── cycle.mjs                    # Autonomous resolve() heartbeat
deploy/
└── deploy.mjs                   # Deploy all 5 + register trusted sources
```

---

Built on [GenLayer](https://genlayer.com) - the blockchain for intelligent contracts.
