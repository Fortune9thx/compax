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
| ReputationRegistry *(redeployed 2026-08-16, 3rd time)* | `0x1654eb6704D90A48729851f4686E5213c7B9C749` | `0x04d16304c07e747866cd598efa3301ca1b109aba3998f3bf2a638da1e7e30683` |
| EscrowAdjudicator *(hero, redeployed 2026-08-16)* | `0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE` | `0xfd3dbd037461ff7cc33f94d1a70f4af867d1d5d07f833bdf8fb90f8ce04a5269` |
| VaultManager *(redesigned 2026-08-16)* | `0xf64B7fBB4F516D0b87cE7003D31B6BA61BC716b0` | `0xb04526248ed0e9bddc0fcd98d8b53b70d2ec40d37d3b0ee85173de3087081ad0` |
| PredictionMarket *(redeployed 2026-08-16, 2nd time)* | `0xE2681E5Ec27175ADC4173b949928F3Bbb24f6b07` | `0x3427e4ba21d901d073af0b04571114499149cea86cd5cc0acc3d3be236983448` |
| CreditLine | `0xC04F7900840a8088909b906bD429A4a834715Ca5` | `0x52a92d8a87514891bdfa8cd8903e8fa1a909f54a5c95a2cc4257a901f52a7146` |

Four contracts were redeployed multiple times on 2026-08-16 across the same
day's audit passes. In order: (1) EscrowAdjudicator/PredictionMarket for a
stuck-funds bug in challenge bonds; (2) VaultManager/ReputationRegistry for
the mandate-adjudication redesign; (3) PredictionMarket/ReputationRegistry
again for a case-sensitivity bug that silently broke stake lookups and
reputation scores for any wallet returning a lowercase address (the normal
case for `eth_accounts` on most wallets). See [SECURITY.md](SECURITY.md#fixed-since-last-review-2026-08-16)
for the full disclosure, including that bonds/stakes sent to superseded
addresses during earlier testing are permanently unrecoverable.

All 5 are independent - none take constructor arguments, none call each other automatically. Source: [`contracts/`](contracts/), single source of truth for addresses: [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Verified end-to-end, with real transactions - not just deployed

Every contract was exercised through a full real lifecycle on Bradbury before shipping, not just unit-tested locally. Some results genuinely surprised us:

- **EscrowAdjudicator**: created a real escrow, had a second real account accept and submit thin evidence (one sentence + a URL that only contained Bitcoin price data against a "500-word summary of top 3 cryptocurrencies" requirement). `resolve()` fetched that evidence URL live and correctly resolved `clawback`, citing the specific gap. The funder's balance confirmed a full refund (only gas was spent).
- **PredictionMarket**: the market's own creator proposed "yes" on a question, citing historical BTC prices. `resolve()` independently determined the question was actually about a forward-looking 24-hour window that hadn't elapsed, sided with the challenger, and resolved **"no" - disagreeing with the creator's own proposal.** This is the "creator cannot unilaterally resolve" property working for real, not just enforced by access control.
- **CreditLine**: a contested default (lender claims breach, borrower rebuts with a credible explanation) resolved to a nuanced **3500/6500 collateral split**, not all-or-nothing, with reasoning that explicitly weighed both sides and live market conditions.
- **VaultManager**: mandate scope is now a transparent, deterministic risk-tier rule (not an LLM decision, closing what was previously the one genuinely weak "decorative AI" link in this app), and `move_to_prediction` is still rejected on-chain (`FINISHED_WITH_ERROR`) when a vault's risk tier doesn't permit it. The real Intelligent Contract behavior moved to `resolve_movement()`: a depositor challenges a specific capital movement against the vault's stated objective, and five validators independently adjudicate compliant vs. violation using live market context - the exact same challenge/bond/resolve pattern already proven in EscrowAdjudicator and PredictionMarket, applied to capital stewardship.
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
