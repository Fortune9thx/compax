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
| LendingMarket | `0x6816269DA605941F6C71bbCc5C60CAB246AB39Cb` | `0xeab0fe848639b7b582dfa5b70c350694552acca01a3dc16fcdd5d4a9b55b730d` |
| BuilderFunding | `0x4406d3DB9E6b325fB7f62413F345F305c1907b30` | `0x881e4b1f796ea37aebca4ace364698573ad8cb0c5db805701ecfad6be2fe9faa` |
| PredictionMarkets | `0x7DdE3cE13a2E0E95E031679CD3D6253637eDC59b` | `0x70565d1931fcca337600f2276f86a55cddd10897ff8166c4ca2763ca603b6059` |
| VaultManager | `0xd37e61f9862cC7618e39FD7363eF22bCbDb68c8C` | `0x0309edaa216334c70bdf3618a4eecad4af670528fddbcfb5c56fa4b98f921a56` |
| StakingReserve | `0xf96B4b4E9FA17701d27CA3470c9cAF1d291e61F6` | `0xe8af2cda449e1343dd226a9bcdd0b15f33f779825500e701f525853ea70e7769` |

All 7 are independent — none take constructor arguments and none call each other. Source: [`contracts/`](contracts/), addresses are the single source of truth in [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Architecture notes for reviewers

- **Signing**: every write is signed client-side by the connected wallet via `genlayer-js` (`src/lib/genlayer.ts`) — there is no server-side relayer key and no backend API route in the write path.
- **Storage**: all 7 contracts use `TreeMap[str, str]` with JSON-serialized values, not `@allow_storage`/`@dataclass`. This was a deliberate, tested decision — see [`contracts/deploy_order.md`](contracts/deploy_order.md) and the commit history: both `@allow_storage` dataclasses and plain non-`str` `TreeMap` value types (`u256`, `bool`) were pilot-deployed on this GenVM build and, while the deploy transaction reached ACCEPTED normally, the resulting contract became permanently unreadable on every subsequent call. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Consensus display**: the UI's validator-consensus indicator only ever shows a state that's actually true — `ACCEPTED` (five validators reached consensus, real chain semantics) or an unresolved/deliberating state. It never fabricates a per-validator vote breakdown, since no contract exposes individual validator votes.
- **Security**: prompt-injection defenses on all user-supplied text feeding into LLM prompts (strips `{ } [ ] \` " #` and normalizes whitespace before interpolation); owner-gated admin actions (`trigger_event`, `resolve_event`, `add_keeper`); every unbounded `get_all_*`/history view method takes `offset`/`limit` pagination.
- **Settlement (paying value back out)**: sending native GEN from a contract to a user's wallet requires declaring an `@gl.evm.contract_interface` recipient stub and calling `emit_transfer` on it (documented at [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers)). `VaultManager.withdraw`, `StakingReserve.unstake`, and `PredictionMarkets.claim_winnings` all use this — each only pays out from value the contract already holds from a prior deposit/stake, so payouts are always backed.

## Known limitation — no settlement path yet for loans and builder funding

`LendingMarket` and `BuilderFunding` never receive an initial capital pool: there's no method that lets the contract accumulate funds to lend or grant from before a loan/proposal is approved. So today, an "approved" loan or "funded" project is a real, AI-reasoned decision recorded onchain — but the borrower/applicant is not actually sent the cGEN, and `repay_loan`/`repay_funding` would ask them to repay money they never received. This needs a deliberate design decision (e.g. an owner-fundable treasury deposit method, or routing through `VaultManager`'s already-funded vaults) rather than a quick patch, so it's called out here explicitly rather than left silent. `ReputationSystem.claim_cgen` has the same shape of issue — it's labeled a "faucet" in the UI but only initializes a reputation score, it doesn't mint or transfer any token.

## Test guide for reviewers/community

See [`TESTING.md`](TESTING.md) for a copy-pasteable walkthrough (wallet setup, faucet, creating a vault, exercising all 7 contracts).
