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
| ReputationRegistry | `0x2AA037b22C60A4B741bE0A327ab3fBF8111Aa654` | `0x1ce8ecbb800ee30246e7ad2beb17fab5f8356ef01f250301e623004e670708bd` |
| EscrowAdjudicator *(hero)* | `0xEbb35Ee78426f96D94826A8368cf233947AA3Ab0` | `0xd42596d6699a2af9d87825e54ad2d5e3deea67ee1770d2af9426417f42546a89` |
| VaultManager | `0x6603A01C16c1F865A33c36389F19D0537E94806d` | redeployed separately same day, fixing an `on='finalized'` delivery issue found after initial deploy - see SECURITY.md |
| PredictionMarket | `0xA94D7d2af016DC4A984546150C651b27d7fb5159` | `0xf715a94d2428891afb8600e360f17af3fb7aa969591de4307b6a79d0350cdc88` |
| CreditLine | `0x961CDf9C1a870D1FCa71b7C31A54087bBaD71D67` | `0xd52c250061a968ed2158e79350031141c89f0cb20a0f8f8146605dfb85727041` |

All 5 were redeployed on 2026-08-20 in response to a GenLayer steward
review requesting more information - real fixes to authoritative sourcing,
timing enforcement, vault custody, and payout conservation, plus two
earlier redeploy days (2026-08-16, four passes: challenge-bond stuck
funds, the VaultManager mandate-adjudication redesign, address
case-sensitivity, `genvm-lint` compliance). Full changelog with root
causes for every pass: [SECURITY.md](SECURITY.md#fixed-since-last-review-2026-08-20-fifth-pass---steward-review-sourcing-timing-custody-conservation).
Funds/stakes sent to any earlier, now-superseded address are permanently
unrecoverable - each fix required a fresh contract instance.

All 5 are independent - none take constructor arguments, none call each other automatically. Source: [`contracts/`](contracts/), single source of truth for addresses: [`src/lib/contracts.ts`](src/lib/contracts.ts).

## Verified end-to-end, with real transactions - not just deployed

Every contract was exercised through a full real lifecycle on Bradbury before shipping, not just unit-tested locally. Some results genuinely surprised us:

- **EscrowAdjudicator**: created a real escrow, had a second real account accept and submit thin evidence (one sentence + a URL that only contained Bitcoin price data against a "500-word summary of top 3 cryptocurrencies" requirement). `resolve()` fetched that evidence URL live and correctly resolved `clawback`, citing the specific gap. The funder's balance confirmed a full refund (only gas was spent).
- **PredictionMarket**: the market's own creator proposed "yes" on a question, citing historical BTC prices. `resolve()` independently determined the question was actually about a forward-looking 24-hour window that hadn't elapsed, sided with the challenger, and resolved **"no" - disagreeing with the creator's own proposal.** This is the "creator cannot unilaterally resolve" property working for real, not just enforced by access control.
- **CreditLine**: a contested default (lender claims breach, borrower rebuts with a credible explanation) resolved to a nuanced **3500/6500 collateral split**, not all-or-nothing, with reasoning that explicitly weighed both sides and live market conditions.
- **VaultManager**: mandate scope is a transparent, deterministic risk-tier rule (not an LLM decision - running a fixed lookup through consensus would be decorative), and `move_to_prediction` is still rejected on-chain (`FINISHED_WITH_ERROR`) when a vault's risk tier doesn't permit it. The real Intelligent Contract behavior lives in `resolve_movement()`: a depositor challenges a specific capital movement against the vault's stated objective, and five validators independently adjudicate compliant vs. violation using live market context. Capital movement itself funds the target instrument **directly** via a cross-contract call carrying value - verified live: a vault funded a real, separately-opened credit line with the vault owner (not `VaultManager` itself) landing as `lender` of record, confirmed both via the line's own state and via `VaultManager`'s balance staying flat through a full repay cycle.
- **ReputationRegistry**: pulled a real resolved escrow's outcome via cross-contract `.view()` reads (a deliberate design choice, not a workaround - see architecture notes below), correctly applied a bounded, contextual score delta, and correctly rejected a duplicate claim attempt.
- **Payout conservation**: a real bug in `PredictionMarket`'s payout math (forfeited challenge bonds diluting the share denominator instead of adding to the shared pot, stranding GEN with no claim path) was found by working through the arithmetic by hand, then confirmed live - a contested market (600/400/200 stakes and bond) distributed its full pool to the winner, exactly.

## Architecture notes for reviewers

- **Signing**: every write is signed client-side by the connected wallet via `genlayer-js` - no server-side relayer, no backend API route.
- **Storage**: `TreeMap[str, str]` with JSON-serialized values throughout - a deliberate, tested decision. `@allow_storage`/`@dataclass` and plain non-`str` `TreeMap` value types (`u256`, `bool`) were pilot-deployed on this GenVM build and, while the deploy transaction reached ACCEPTED normally, the resulting contract became permanently unreadable on every subsequent call. `TreeMap[str, str]` is the only pattern verified to read reliably.
- **Cross-contract calls**: writes (`gl.get_contract_at(addr).emit(value=..., on='accepted').method(args)`) work and carry value correctly - confirmed live, both in isolation and in `VaultManager`'s real capital-movement flow. An earlier finding that writes were broken was a false negative (checking state immediately instead of waiting for `emit()`'s own asynchronous follow-up transaction); a narrower, still-real finding is that the same call with `on='finalized'` does not reliably deliver on this build, so `VaultManager` uses `on='accepted'` deliberately - see [`contracts/deploy_order.md`](contracts/deploy_order.md) and `VaultManager`'s own docstring for the tradeoff. Reads (`gl.get_contract_at(addr).view().method(args)`) work correctly; `ReputationRegistry` still deliberately pulls via `.view()` rather than being pushed to, since that model is simple, auditable, and unaffected by the correction above.
- **Value transfers**: every payout uses the documented `@gl.evm.contract_interface` `_Recipient` stub + `emit_transfer()` pattern from [Value Transfers](https://docs.genlayer.com/developers/intelligent-contracts/advanced-features/value-transfers). Every payout is bounds-checked against value the contract already holds - nothing can be sent that wasn't actually deposited/staked/collateralized by someone. This mechanism was separately confirmed to silently fail to deliver when the recipient is another Intelligent Contract rather than a real EOA (no error, no rescue path) - every contract here is careful to only ever record a real human address as a payout recipient.
- **Security**: prompt-injection defenses on all user-supplied text feeding into LLM prompts; owner-gated admin actions; every unbounded `get_all_*` view method takes `offset`/`limit` pagination; `CreditLine` is always over-collateralized; `EscrowAdjudicator`/`PredictionMarket` resolution is permissionless and independent of the party who benefits from a favorable outcome; every payout formula's conservation (nothing paid out exceeds what's actually held) has been hand-verified, not just spot-checked against one test transaction.
- **Onchain timing**: real deterministic timestamps (`datetime.now(timezone.utc)`, pinned to the transaction's own datetime, identical across every validator - no consensus overhead) gate deadlines directly in the contracts: `PredictionMarket` rejects proposals before its deadline, `EscrowAdjudicator` lets a funder reclaim capital from a provider who never delivered before the deadline, `CreditLine` rejects default claims before its due date.
- **Vault capital movement funds the target instrument directly**: `VaultManager.move_to_*` calls the target contract's own creation/entry method via a value-carrying cross-contract emit, with the vault owner's real address recorded as funder/lender/position-holder (never `VaultManager`'s own address - see the value-transfer note above for why). Not literally synchronous (`emit()` is asynchronous), but real custody enforcement - the owner cannot skip creating the instrument or redirect the capital elsewhere.

## Test guide for reviewers/community

See [`TESTING.md`](TESTING.md) for a copy-pasteable walkthrough covering all 5 contracts.
