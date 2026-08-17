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
| ReputationRegistry | `0xFffD427a00E09f6a1F0E896B1B85EC886bC10483` | `0x785b124623c79c8799b5f8c3d88da682237ad0e26740e4219e112ddcc887a25a` |
| EscrowAdjudicator *(hero)* | `0x95b12ecc4087DD49694a5F2ad8788C9bb350B428` | `0xb08ce234b093fa6f77f3914daeb1bd8463be6eff35162d252e5c9886507da3d0` |
| VaultManager | `0xdCB85486089582295E6Fdb537Cbb0fF88e5B4b93` | `0x1d87baee32e7b3094af6517649442df7c36b0879f550925f16fdc1021f118833` |
| PredictionMarket | `0xD75F83263bDc7D7C04F755A9db849c25Ee47d207` | `0x3690747e9e161f3f3d6e92366f3d76cf52a25d13ed3f1016f916d5422377bfd0` |
| CreditLine | `0xEF190d82F1B6afDc7437A7B623A98F3e63Fc733f` | `0xc205aa6b95736a702fd4ef656531cc631a073aa5c70ec799ddf2a3ac102b1190` |

All 5 were redeployed on 2026-08-16 across four consecutive audit passes in
the same day - a stuck-funds fix in challenge bonds, the VaultManager
mandate-adjudication redesign, an address case-sensitivity fix across
PredictionMarket/ReputationRegistry, and finally a `genvm-lint` compliance
fix required in every one of the five contracts. Full changelog with root
causes: [SECURITY.md](SECURITY.md#fixed-since-last-review-2026-08-16).
Funds/stakes sent to any earlier, now-superseded address that day are
permanently unrecoverable - each fix required a fresh contract instance.

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
