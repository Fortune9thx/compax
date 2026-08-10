# Compax — GenLayer Bradbury Portal Submission

## Overview

| | |
|---|---|
| **Name** | Compax — The Adjudication Layer for Autonomous Capital |
| **Network** | GenLayer Bradbury Testnet (chainId `4221`) |
| **Live app** | https://compax-sepia.vercel.app |
| **Repository** | https://github.com/Fortune9thx/compax |
| **RPC** | `https://rpc-bradbury.genlayer.com` |
| **Consensus contract** | `0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D` |

## One-line description

Multi-party capital is locked under natural-language mandates. GenLayer validators evaluate live web evidence and submitted proof, reaching consensus to release, claw back, reallocate, or split funds — with full reasoning and a native appeal path onchain.

## Why this is a GenLayer-native application, not a normal dApp

Every capital-moving decision in this app requires judgment over real-world web data or contested evidence, and uses `gl.eq_principle.prompt_non_comparative` (LLM reasoning, five-validator consensus) grounded in live data from `gl.eq_principle.strict_eq` + `gl.nondet.web.get`. None of it is deterministic portfolio rebalancing, and no capital moves through a centralized pool the platform funds itself.

## Deployed contracts (Bradbury, deployed 2026-07-31)

| Contract | Address | Deploy tx |
|---|---|---|
| ReputationRegistry | `0xbfFbe7c3c6996E8cB7063feA4c28D88A72Db52aa` | `0x357cf036b825385a0987cb65841c8b5e71ccbaff327c6c1f64de29fbfab559de` |
| EscrowAdjudicator *(hero)* | `0x44d0efE9E1d8529f4295C8EBE7c6426F7e1493EC` | `0x9d57fbe7ad05c7edeb0c76db8cc3a4673bcf9e4d22e77effd7859e018dc152bb` |
| VaultManager | `0x0815b09F89C97807c50e9fB2aa2744E21C895122` | `0x49bec0d2f35d52389c2bb609063d0ea7d2b1213e95f8fbbde6046db76b4c5a63` |
| PredictionMarket | `0x040CAb1ae474C6d775367734D13c903992b1806B` | `0xdaa0e3bbb3ed2c6afb9343c6ece63d0aff5dedc8f36332d36848e19d5e273dd6` |
| CreditLine | `0xC04F7900840a8088909b906bD429A4a834715Ca5` | `0x52a92d8a87514891bdfa8cd8903e8fa1a909f54a5c95a2cc4257a901f52a7146` |

All 5 are independent — none take constructor arguments, none call each other automatically. Source: [`contracts/`](contracts/), single source of truth for addresses: [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Verified end-to-end, with real transactions — not just deployed

Every contract was exercised through a full real lifecycle on Bradbury before shipping, not just unit-tested locally. Some results genuinely surprised us:

- **EscrowAdjudicator**: created a real escrow, had a second real account accept and submit thin evidence (one sentence + a URL that only contained Bitcoin price data against a "500-word summary of top 3 cryptocurrencies" requirement). `resolve()` fetched that evidence URL live and correctly resolved `clawback`, citing the specific gap. The funder's balance confirmed a full refund (only gas was spent).
- **PredictionMarket**: the market's own creator proposed "yes" on a question, citing historical BTC prices. `resolve()` independently determined the question was actually about a forward-looking 24-hour window that hadn't elapsed, sided with the challenger, and resolved **"no" — disagreeing with the creator's own proposal.** This is the "creator cannot unilaterally resolve" property working for real, not just enforced by access control.
- **CreditLine**: a contested default (lender claims breach, borrower rebuts with a credible explanation) resolved to a nuanced **3500/6500 collateral split**, not all-or-nothing, with reasoning that explicitly weighed both sides and live market conditions.
- **VaultManager**: a mandate correctly gated capital movement — `move_to_prediction` was rejected on-chain (`FINISHED_WITH_ERROR`) when the vault's AI-reasoned mandate didn't permit it, and a keeper-triggered `re_evaluate_mandate` produced a genuinely different, well-reasoned mandate after new context.
- **ReputationRegistry**: pulled a real resolved escrow's outcome via cross-contract `.view()` reads (not pushed inline — see limitation below), correctly applied a bounded, contextual score delta, and correctly rejected a duplicate claim attempt.

## Architecture notes for reviewers

- **Signing**: every write is signed client-side by the connected wallet via `genlayer-js` — no server-side relayer, no backend API route.
- **Storage**: `TreeMap[str, str]` with JSON-serialized values throughout — a deliberate, tested decision. `@allow_storage`/`@dataclass` and plain non-`str` `TreeMap` value types (`u256`, `bool`) were pilot-deployed on this GenVM build and, while the deploy transaction reached ACCEPTED normally, the resulting contract became permanently unreadable on every subsequent call. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Cross-contract calls**: writes (`gl.get_contract_at(addr).emit(on=...).method(args)`) are confirmed broken on this build — the caller's tx accepts, the callee's state never changes, with no error surfaced. Reads (`gl.get_contract_at(addr).view().method(args)`) work correctly and were used to build a pull-based reputation model instead of a push-based one. Full detail in [`contracts/deploy_order.md`](contracts/deploy_order.md).
- **Value transfers**: every payout uses the documented `@gl.evm.contract_interface` `_Recipient` stub + `emit_transfer()` pattern from [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers). Every payout is bounds-checked against value the contract already holds — nothing can be sent that wasn't actually deposited/staked/collateralized by someone.
- **Security**: prompt-injection defenses on all user-supplied text feeding into LLM prompts; owner-gated admin actions; every unbounded `get_all_*` view method takes `offset`/`limit` pagination; `CreditLine` is always over-collateralized; `EscrowAdjudicator`/`PredictionMarket` resolution is permissionless and independent of the party who benefits from a favorable outcome.
- **No onchain wall-clock**: deadline gating for the autonomous keeper happens off-chain (`keeper/cycle.mjs`, where `Date.now()` is trivially available) rather than inside the contracts, which have no verified way to check "has this deadline passed."

## Test guide for reviewers/community

See [`TESTING.md`](TESTING.md) for a copy-pasteable walkthrough covering all 5 contracts.
