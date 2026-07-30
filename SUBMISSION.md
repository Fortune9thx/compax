# Compax — GenLayer Bradbury Portal Submission

## Overview

| | |
|---|---|
| **Name** | Compax — The Operating System for Autonomous Capital |
| **Network** | GenLayer Bradbury Testnet (chainId `4221`) |
| **Live app** | https://compax-sepia.vercel.app |
| **Repository** | https://github.com/Fortune9thx/compax |
| **RPC** | `https://rpc-bradbury.genlayer.com` |
| **Consensus contract** | `0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D` |

## One-line description

An autonomous treasury: users state an objective in a sentence, and GenLayer intelligent contracts reason over live market data to continuously allocate capital across lending, staking, builder funding, and prediction markets — with every decision, and the data that informed it, written onchain.

## What makes it an intelligent-contract application (not a normal dApp)

Every one of the 7 contracts uses `gl.eq_principle.prompt_non_comparative` (LLM reasoning validated by consensus) or `gl.eq_principle.strict_eq` (deterministic live-data fetch validated by consensus) for its core decision — not just a UI wrapper around fixed logic:

- **VaultManager** — reasons the *initial* allocation at vault creation, and every rebalance, from live CoinGecko prices + the Fear & Greed index.
- **LendingMarket** — reasons loan approval, interest rate, and risk score from live market conditions.
- **BuilderFunding** — reasons fund/reject/partial funding decisions against live ecosystem context.
- **PredictionMarkets** — reasons binary market resolution.
- **ReputationSystem** — reasons the *magnitude* of each reputation delta from context/severity, not a fixed constant.
- **EconomicEvents** — reasons event severity and vault guidance from live data.
- **StakingReserve** — reasons per-position yield band and validator tier from live conditions.

An optional autonomous keeper (`keeper/cycle.mjs`) can trigger `rebalance_vault` on a schedule without a human present — it decides nothing and cannot move funds, it only asks the contract to reason. This is what "the intelligent contract is the portfolio manager" means concretely: the keeper is a heartbeat, not a decision-maker.

## Deployed contracts (Bradbury, deployed 2026-07-30)

| Contract | Address | Deploy tx |
|---|---|---|
| EconomicEvents | `0x029619b9099f542bB858CEbB41D3bC1cf2e87281` | `0xacfff696b7066e6700da1b8ecd7bea92640991f602fb60ab6ed25ab8d1109aae` |
| ReputationSystem | `0x972989090981eaB85a01FE99FfB8D214c1870F33` | `0x189fd0d2e51df499c3b8f7932e0ca5dc958135b03f2c3b274d729f8bf3a254a0` |
| LendingMarket | `0x5baDe34F61FEC6B9Cf4E6eb51411D0e91aB7Fd2f` | `0x4444d96c05356f74cbdc7e82f5047b5625841d0795394edd6a4a86d28f1844af` |
| BuilderFunding | `0x4724f2743bC4d6d87D0611Fb5a75064a4762790A` | `0xb81b04aa6efbfb11424128bf0595c05f7795cd56e7d742714de801b8299929b2` |
| PredictionMarkets | `0xC05D520Af05358f924B124D8cf0f13bd757CbAF1` | `0xa8c7ad5668a99207ffbd7026e85f209c2c6f439b8cef4cf8ac6201123dab2df4` |
| VaultManager | `0xD51CC631F9Bc3cA3507388bBBCcC6BD063e84e75` | `0x42371afc639a73c6350d5d138f83832569ff224b94ad15994cb15f114eeb04aa` |
| StakingReserve | `0x9bD81Dd88C373c13Bc028497f45A371FF75765BB` | `0x14d41635dfcfb525ef53c974db410ebdcaa168b3076a0da5f293a17389dc5aeb` |

All 7 are independent — none take constructor arguments and none call each other. Source: [`contracts/`](contracts/), addresses are the single source of truth in [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Architecture notes for reviewers

- **Signing**: every write is signed client-side by the connected wallet via `genlayer-js` (`src/lib/genlayer.ts`) — there is no server-side relayer key and no backend API route in the write path.
- **Storage**: all 7 contracts use `TreeMap[str, str]` with JSON-serialized values, not `@allow_storage`/`@dataclass`. This was a deliberate, tested decision — see [`contracts/deploy_order.md`](contracts/deploy_order.md) and the commit history: both `@allow_storage` dataclasses and plain non-`str` `TreeMap` value types (`u256`, `bool`) were pilot-deployed on this GenVM build and, while the deploy transaction reached ACCEPTED normally, the resulting contract became permanently unreadable on every subsequent call. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Consensus display**: the UI's validator-consensus indicator only ever shows a state that's actually true — `ACCEPTED` (five validators reached consensus, real chain semantics) or an unresolved/deliberating state. It never fabricates a per-validator vote breakdown, since no contract exposes individual validator votes.
- **Security**: prompt-injection defenses on all user-supplied text feeding into LLM prompts (strips `{ } [ ] \` " #` and normalizes whitespace before interpolation); owner-gated admin actions (`trigger_event`, `resolve_event`, `add_keeper`); every unbounded `get_all_*`/history view method takes `offset`/`limit` pagination.
- **Settlement (paying value back out)**: sending native GEN from a contract to a user's wallet requires declaring an `@gl.evm.contract_interface` recipient stub and calling `emit_transfer` on it (documented at [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers)). `VaultManager.withdraw`, `StakingReserve.unstake`, and `PredictionMarkets.claim_winnings` all use this — each only pays out from value the contract already holds from a prior deposit/stake, so payouts are always backed.

## Liquidity: how loans and grants are actually funded

`LendingMarket` and `BuilderFunding` now disburse for real, from an owner-funded cGEN pool (`fund_pool`, `get_pool_balance`), gated by a solvency check that downgrades any AI decision the pool can't actually cover. See [README.md § Liquidity & settlement](README.md#liquidity--settlement) for the full mechanics, code, and an honest list of what's still needed before this could be a real mainnet lending market (collateral/default enforcement, actually-collected interest, decentralized pool funding, automatic reputation wiring, utilization-based rates, an audit).

`ReputationSystem.claim_cgen` is unrelated to this — it's labeled "Activate" in the UI (was "faucet," which was misleading) and only initializes a reputation score; it doesn't mint or transfer any token.

## Test guide for reviewers/community

See [`TESTING.md`](TESTING.md) for a copy-pasteable walkthrough (wallet setup, faucet, creating a vault, exercising all 7 contracts).
