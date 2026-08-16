# Compax - GenLayer Bradbury Portal Submission

## Overview

| | |
|---|---|
| **Name** | Compax - The Adjudication Layer for Autonomous Capital |
| **Network** | GenLayer Bradbury Testnet (chainId `4221`) |
| **Live app** | https://compax-sepia.vercel.app |
| **Repository** | https://github.com/Fortune9thx/compax |
| **RPC** | `https://rpc-bradbury.genlayer.com` |
| **Consensus contract** | `0x0112Bf6e83497965A5fdD6Dad1E447a6E004271D` |

## One-line description

Multi-party capital is locked under natural-language mandates. GenLayer validators evaluate live web evidence and submitted proof, reaching consensus to release, claw back, reallocate, or split funds - with full reasoning and a native appeal path onchain.

## Why this is a GenLayer-native application, not a normal dApp

Every capital-moving decision in this app requires judgment over real-world web data or contested evidence, and uses `gl.eq_principle.prompt_non_comparative` (LLM reasoning, five-validator consensus) grounded in live data from `gl.eq_principle.strict_eq` + `gl.nondet.web.get`. None of it is deterministic portfolio rebalancing, and no capital moves through a centralized pool the platform funds itself.

## Deployed contracts (Bradbury)

| Contract | Address | Deploy tx |
|---|---|---|
| ReputationRegistry *(redeployed 2026-08-10)* | `0x959F078FC466AB57204BBB8F0Cf04CE08C074EaD` | `0xa0697aaf2a994bb37dfc1479ad3aea6d2127b0a6d2889e7028a21292b7010122` |
| EscrowAdjudicator *(hero, redeployed 2026-08-16)* | `0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE` | `0xfd3dbd037461ff7cc33f94d1a70f4af867d1d5d07f833bdf8fb90f8ce04a5269` |
| VaultManager | `0x0815b09F89C97807c50e9fB2aa2744E21C895122` | `0x49bec0d2f35d52389c2bb609063d0ea7d2b1213e95f8fbbde6046db76b4c5a63` |
| PredictionMarket *(redeployed 2026-08-16)* | `0xc45693a4404737039A1A69b338Bef0083752dcb7` | `0xcc6e97ffbe463a73b74d4024eb5966256c5c5c85c3cbcafe045ed9e01ac3a156` |
| CreditLine | `0xC04F7900840a8088909b906bD429A4a834715Ca5` | `0x52a92d8a87514891bdfa8cd8903e8fa1a909f54a5c95a2cc4257a901f52a7146` |

EscrowAdjudicator and PredictionMarket were redeployed on 2026-08-16 to fix a
serious bug: `challenge()`/`challenge_proposal()` collected a real, payable
bond with no code path that ever paid it back out. See [SECURITY.md](SECURITY.md#fixed-since-last-review-2026-08-16)
for the full disclosure, including that bonds sent to the previous addresses
during earlier testing are permanently unrecoverable.

All 5 are independent - none take constructor arguments, none call each other automatically. Source: [`contracts/`](contracts/), single source of truth for addresses: [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Verified end-to-end, with real transactions - not just deployed

Every contract was exercised through a full real lifecycle on Bradbury before shipping, not just unit-tested locally. Some results genuinely surprised us:

- **EscrowAdjudicator**: created a real escrow, had a second real account accept and submit thin evidence (one sentence + a URL that only contained Bitcoin price data against a "500-word summary of top 3 cryptocurrencies" requirement). `resolve()` fetched that evidence URL live and correctly resolved `clawback`, citing the specific gap. The funder's balance confirmed a full refund (only gas was spent).
- **PredictionMarket**: the market's own creator proposed "yes" on a question, citing historical BTC prices. `resolve()` independently determined the question was actually about a forward-looking 24-hour window that hadn't elapsed, sided with the challenger, and resolved **"no" - disagreeing with the creator's own proposal.** This is the "creator cannot unilaterally resolve" property working for real, not just enforced by access control.
- **CreditLine**: a contested default (lender claims breach, borrower rebuts with a credible explanation) resolved to a nuanced **3500/6500 collateral split**, not all-or-nothing, with reasoning that explicitly weighed both sides and live market conditions.
- **VaultManager**: a mandate correctly gated capital movement - `move_to_prediction` was rejected on-chain (`FINISHED_WITH_ERROR`) when the vault's AI-reasoned mandate didn't permit it, and a keeper-triggered `re_evaluate_mandate` produced a genuinely different, well-reasoned mandate after new context.
- **ReputationRegistry**: pulled a real resolved escrow's outcome via cross-contract `.view()` reads (not pushed inline - see limitation below), correctly applied a bounded, contextual score delta, and correctly rejected a duplicate claim attempt.

## Architecture notes for reviewers

- **Signing**: every write is signed client-side by the connected wallet via `genlayer-js` - no server-side relayer, no backend API route.
- **Storage**: `TreeMap[str, str]` with JSON-serialized values throughout - a deliberate, tested decision. `@allow_storage`/`@dataclass` and plain non-`str` `TreeMap` value types (`u256`, `bool`) were pilot-deployed on this GenVM build and, while the deploy transaction reached ACCEPTED normally, the resulting contract became permanently unreadable on every subsequent call. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Cross-contract calls**: writes (`gl.get_contract_at(addr).emit(on=...).method(args)`) are confirmed broken on this build - the caller's tx accepts, the callee's state never changes, with no error surfaced. Reads (`gl.get_contract_at(addr).view().method(args)`) work correctly and were used to build a pull-based reputation model instead of a push-based one. Full detail in [`contracts/deploy_order.md`](contracts/deploy_order.md).
- **Value transfers**: every payout uses the documented `@gl.evm.contract_interface` `_Recipient` stub + `emit_transfer()` pattern from [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers). Every payout is bounds-checked against value the contract already holds - nothing can be sent that wasn't actually deposited/staked/collateralized by someone.
- **Security**: prompt-injection defenses on all user-supplied text feeding into LLM prompts; owner-gated admin actions; every unbounded `get_all_*` view method takes `offset`/`limit` pagination; `CreditLine` is always over-collateralized; `EscrowAdjudicator`/`PredictionMarket` resolution is permissionless and independent of the party who benefits from a favorable outcome.
- **No onchain wall-clock**: deadline gating for the autonomous keeper happens off-chain (`keeper/cycle.mjs`, where `Date.now()` is trivially available) rather than inside the contracts, which have no verified way to check "has this deadline passed."
- **Vault capital movement is two-step, not atomic**: `VaultManager.move_to_*` releases mandate-approved capital to the vault owner's own wallet (a plain, working value transfer), not directly into a newly created instrument, because of the cross-contract-write limitation above. The owner then funds the real escrow/market/credit line themselves in a separate transaction - the UI states this explicitly rather than implying one-click atomicity.

## Test guide for reviewers/community

See [`TESTING.md`](TESTING.md) for a copy-pasteable walkthrough covering all 5 contracts.
