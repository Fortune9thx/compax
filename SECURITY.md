# Security & Trust Model

This document is the canonical security reference for COMPAX v2, written for
GenLayer portal reviewers and anyone auditing the contracts in `contracts/`.

## Trust model

- **No admin key controls user funds.** The `_owner` set in each contract's
  `__init__` (the deployer) can only manage registry-style state: adding/
  removing trusted sources and keepers on `ReputationRegistry`, adding/
  removing keepers on `VaultManager`. The owner cannot move a user's escrow,
  stake, collateral, or vault treasury.
- **Every value transfer requires the value to already be held by the
  contract**, deposited by the party receiving the payout's counterparty
  (funder, lender, staker). No contract here holds a platform-funded pool
  that pays out without an equal, real deposit from an opposing party.
- **AI adjudication is independent, not a rubber stamp.** `resolve()` /
  `resolve_default()` have no caller restriction (permissionless) and no
  branch that special-cases the proposer or the party who benefits. Each
  fetches live web data itself via `gl.eq_principle.strict_eq` and reasons
  fresh from the original mandate via `gl.eq_principle.prompt_non_comparative`
  five-validator consensus.
- **Reputation is pull-based and source-restricted.** `ReputationRegistry`
  never receives a push from the adjudicating contracts (cross-contract
  writes silently no-op on this Bradbury GenVM build - see
  `contracts/deploy_order.md`). Instead a party or keeper calls
  `record_from_escrow` / `record_from_prediction` / `record_from_credit`,
  which reads the resolved instrument via `.view()` and verifies the source
  address is on the owner-curated `trusted_sources` allowlist before trusting
  its reported status. Without that allowlist, anyone could deploy a fake
  contract mimicking `get_escrow()`'s shape with `status="resolved"` to
  fabricate reputation.

## Access-control matrix

| Contract | Method | Who can call | Enforcement |
|---|---|---|---|
| EscrowAdjudicator | `create_escrow` | Anyone (becomes funder) | funder != provider enforced |
| EscrowAdjudicator | `accept_escrow` | Named provider only | `sender != provider` reverts |
| EscrowAdjudicator | `submit_evidence` | Named provider only | `sender != provider` reverts |
| EscrowAdjudicator | `challenge` | Anyone (bond required) | payable, no self-restriction by design; bond refunded to challenger or forfeited to provider inside `resolve()` depending on outcome |
| EscrowAdjudicator | `resolve` | Anyone (permissionless) | status must be `evidence_submitted`/`challenged` |
| PredictionMarket | `stake` | Anyone | one position per staker enforced |
| PredictionMarket | `propose_outcome` | Anyone | status must be `active` |
| PredictionMarket | `challenge_proposal` | Anyone (bond required) | status must be `proposed`/`challenged`; bond refunded to challenger if vindicated, otherwise folded into the winning stake pool inside `resolve()` |
| PredictionMarket | `resolve` | Anyone (permissionless) | status must be `proposed`/`challenged` |
| PredictionMarket | `claim_winnings` | Staker on the winning side only | `claimed` dedupe, position must equal outcome |
| CreditLine | `open_line` | Anyone (becomes borrower) | payable = collateral |
| CreditLine | `fund_line` | Anyone except the borrower | `lender == borrower` reverts |
| CreditLine | `repay` | Borrower only | `sender != borrower` reverts |
| CreditLine | `claim_default` | Lender only | `sender != lender` reverts |
| CreditLine | `dispute_default` | Borrower only | `sender != borrower` reverts |
| CreditLine | `resolve_default` | Anyone (permissionless) | status must be `default_claimed`/`disputed` |
| VaultManager | `deposit` | Anyone | none needed (adds to treasury, tracked per-depositor) |
| VaultManager | `withdraw_deposit` | Any depositor, own claim only | balance/treasury bounds check; owner has no special claim over others' deposits |
| VaultManager | `move_to_*` | Vault owner only | `sender != owner` reverts, plus deterministic risk-tier allowlist check |
| VaultManager | `challenge_movement` | Anyone (bond required) | status must be `executed`; bond refunded to challenger or forfeited to owner inside `resolve_movement()` |
| VaultManager | `resolve_movement` | Anyone (permissionless) | status must be `challenged` |
| VaultManager | `add_keeper`/`remove_keeper` | Owner (deployer) only | `_only_owner` |
| ReputationRegistry | `record_from_*` | A party to the instrument, the owner, or a registered keeper | `_require_party_or_operator` |
| ReputationRegistry | `add_trusted_source`/`add_keeper` | Owner (deployer) only | `_only_owner` |

Every access-control failure raises `gl.vm.UserError` with a specific,
deterministic message - never a bare `raise Exception`. No contract in this
repository does.

## Prompt-injection mitigations

All free-text fields that ultimately reach an LLM prompt (escrow criteria,
evidence text, challenge reasons, market questions/evidence, credit purpose,
default claims/rebuttals, vault objective/personality) pass through
`_sanitize()` first, defined identically in every contract:

```python
def _sanitize(s: str, max_len: int = 500) -> str:
    for ch in ("{", "}", "[", "]", "`", '"', "#"):
        s = s.replace(ch, "")
    s = s.replace("\\n", " ").replace("\n", " ").replace("\r", " ").replace("\t", " ")
    return s[:max_len].strip()
```

This strips the characters most likely to let user input break out of a
JSON-structured prompt or inject fake delimiters, collapses newlines/control
characters (defeating "ignore previous instructions" formatting tricks), and
hard-caps length. Every LLM call site also imposes a strict output-schema
instruction in the prompt itself (exact keys, an enumerated set of allowed
labels, numeric bounds) and every `json.loads()` of an LLM response is
wrapped in `try/except` with a safe, capital-protective default (e.g. a
malformed adjudication response on an escrow defaults to `clawback` -
funds return to the funder, never released on ambiguous output).

## State-machine invariants

Every stateful object (escrow, market, credit line) has a single `status`
string field, and every state-changing method starts with an explicit guard
on the current status before proceeding - so a second call to `resolve()`
on an already-resolved escrow reverts with `escrow_not_ready_for_resolution`
rather than double-paying. The same pattern covers markets and credit lines.
`ReputationRegistry.claimed` is a separate dedupe map keyed by
`{category}_{source_address}_{instrument_id}[_{user_address}]`, checked
before every reputation delta is applied, so a resolved instrument's outcome
can be pulled into reputation exactly once.

## Fixed since last review (2026-08-16)

A brutal, unbiased re-read of the deployed code (not just its docstrings)
found that `EscrowAdjudicator.challenge()` and `PredictionMarket.
challenge_proposal()` collected a real, payable bond but had **no code path
that ever paid it back out** - the funds sat in the contract forever with
zero withdrawal path, directly in the flagship "evidence can be challenged"
mechanic. `EscrowAdjudicator.accept_escrow()`'s optional `provider_bond` had
the same gap. Both contracts were fixed and redeployed:

- `EscrowAdjudicator.resolve()` now refunds each challenge bond to the
  challenger if the outcome validated their doubt (`partial`/`clawback`), or
  forfeits it to the provider if the evidence was judged fully sufficient
  (`full_release`). `provider_bond` is refunded to the provider unless the
  outcome is `clawback`, in which case it's forfeited to the funder.
- `PredictionMarket.resolve()` now refunds each challenge bond to the
  challenger if the resolved outcome differs from what was proposed (the
  challenge was right), or folds it into the winning side's stake pool if
  the proposal was confirmed - the contract already holds that GEN, so this
  is a state update that increases every correct staker's payout in
  `claim_winnings()`, not a new transfer.
- **Honest disclosure:** this is a contract-code fix, not a data migration.
  Any bond sent to the previous `EscrowAdjudicator` (`0x44d0efE9...`) or
  `PredictionMarket` (`0x040CAb1a...`) deployments during earlier testing is
  permanently unrecoverable - GenVM contracts are immutable once deployed.
  The fix only protects funds sent to the current addresses in
  `src/lib/contracts.ts` going forward.
- `CreditLine` was independently re-read and has no equivalent bond
  mechanic - every payable path there was already fully accounted for.

## Fixed since last review (2026-08-16, second pass) - VaultManager redesign

Two more issues found on re-review, both in `VaultManager`, and both fixed
by redesigning the contract rather than patching around them:

- **Unprotected third-party deposits.** `deposit()` was payable by anyone
  into any vault, but only the vault *owner* could ever `withdraw()` -
  meaning a depositor's funds became the owner's to keep, with zero
  recourse. Fixed: deposits are now individually tracked per depositor
  (`vault_deposits`), and `withdraw_deposit()` lets each depositor reclaim
  only their own undeployed capital. The owner has no special claim over
  money they didn't deposit themselves.
- **Decorative AI in mandate-setting.** `_reasoned_allowed_instruments()`
  ran a five-validator LLM classification with no counterparty, no
  contestability, and no dependency on any external fact - exactly the
  "better LLM response, not a real trust problem" pattern GenLayer
  reviewers reject. Fixed by removing it: which instrument types a vault's
  risk tier permits is now a transparent, deterministic rule
  (`_deterministic_allowed_instruments`), auditable by reading the function.
  The real Intelligent Contract behavior moved to where a genuine, contested
  trust problem actually exists: `resolve_movement()` adjudicates whether a
  *specific* capital movement the owner made, with a stated justification,
  actually complied with the vault's natural-language objective - triggered
  by `challenge_movement()` (any depositor, real bond), weighing live market
  context, exactly the same challenge/bond/resolve/reputation pattern
  already proven in `EscrowAdjudicator`/`PredictionMarket`.

`ReputationRegistry` was extended with a fourth trusted-source category
(`"vault"`) and `record_from_vault()`, and redeployed alongside
`VaultManager`; all four adjudicating contracts were re-registered as
trusted sources on the new address.

## Fixed since last review (2026-08-16, third pass) - address case-sensitivity

The most consequential finding of the day. `PredictionMarket.stake()` and
`claim_winnings()` built their internal lookup key from
`gl.message.sender_address` (always checksummed, mixed-case) without
normalizing it, while `get_user_stake()` compared against whatever raw
address string the caller supplied - and browser wallets almost universally
return lowercase addresses from `eth_accounts`/`eth_requestAccounts`. The
practical effect: "Your stake" never displayed, and the **Claim Winnings**
and **Claim Reputation** buttons never appeared for a real staker, even
though a direct `claim_winnings()` call would have worked fine on-chain -
the UI simply had no way to discover you'd won. Verified live: staking with
a checksummed account and then reading `get_user_stake` with the same
address lowercased returned `{}` before the fix, and the real stake after.

The same bug existed at the platform level in `ReputationRegistry`:
`_ensure_score`/`_apply_delta` (score/history writes) and `get_score`/
`get_history` (reads) never normalized the `address` key, and
`_require_party_or_operator` compared `gl.message.sender_address` against
"party" addresses (like an escrow's `provider`) that were typed into a
frontend form at creation time in whatever case the user happened to use -
so a provider whose own address was entered in a different case than their
wallet's natural checksum could be incorrectly denied when claiming their
own reputation. This affected every category (escrow/prediction/credit/
vault), not just one contract, and also affected the Reputation page's
address-lookup field for looking up anyone else's score.

Fixed by normalizing to lowercase at every write and read choke point:
`PredictionMarket.stake/claim_winnings/get_user_stake`, and
`ReputationRegistry._ensure_score/_apply_delta/get_score/get_history/
_require_party_or_operator`. Both contracts redeployed; all four
adjudicating contracts re-registered as trusted sources on the new
`ReputationRegistry`. As with the earlier fixes, any state written under
the old, case-fragile addresses is not migrated - a fresh deploy starts
clean, which is what happened here.

## Fixed since last review (2026-08-16, fourth pass) - genvm-lint compliance

The single most consequential finding of the whole audit, and the one most
likely to have caused an outright portal rejection: **all 5 contracts
failed `genvm-lint check`** with "nested non-deterministic blocks are
forbidden" / "storage writes are forbidden in non-deterministic contexts" /
"inter-contract calls are forbidden in non-deterministic contexts."

Root cause, isolated by direct experimentation against minimal test
contracts: GenVM's lint tool requires **exactly one non-deterministic call
(`gl.eq_principle.strict_eq`/`prompt_non_comparative`) reachable per write
method, and the leader function passed to it must be a named `def`, never
an inline `lambda:`** - even a single, otherwise-correct `lambda:`-based
call in complete isolation fails. Every `resolve()`/`resolve_default()`/
`resolve_movement()`/`open_line()` in this codebase called `strict_eq`
(to fetch live data) and then a *separate* `prompt_non_comparative` call
(to reason, using an inline `lambda:`) - exactly the rejected pattern.
`ReputationRegistry._reasoned_delta()` had only one call, but it also used
a `lambda:`, which alone was enough to fail.

Every write method fixed to make exactly one non-deterministic call,
via a named function, that does its own web fetch(es) internally before
building and returning the prompt string. Where a contract needed to
persist a snapshot of what live data it saw (`web_data_snapshot`), that
snapshot is now threaded back out through the validated LLM JSON response
itself (the model is asked to echo a short excerpt of what it was shown),
rather than a side-channel variable mutated inside the closure - the
latter is not a documented-safe pattern, since only the equivalence-
validated *return value* of a non-deterministic call is guaranteed
consistent across validators.

While restructuring `PredictionMarket.resolve()`, also fixed a related
honesty issue: its live CoinGecko fetch was labeled "LIVE MARKET DATA" in
the prompt regardless of what the market's actual question was about -
misleading for any non-crypto question. It's now explicitly disclosed to
the model as a live-connectivity/timestamp-freshness proof, to be treated
as relevant evidence only when the question is genuinely about crypto
prices.

Verified with `genvm-lint check` against all 5 contracts (all pass cleanly)
before redeploying; all 5 contracts redeployed, all four adjudicating
contracts re-registered as trusted sources on the new `ReputationRegistry`.

**Why this had gone undetected through extensive live testing:** every
prior resolve()/record_from_*() call succeeded on Bradbury with
`FINISHED_WITH_RETURN` throughout this project's entire history - the
runner version this contract pins (`py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`)
evidently does not enforce this constraint at execution time, even though
`genvm-lint` (which itself reports a newer runner is available) flags it
statically. Whether a human portal reviewer runs lint against the pinned
runner or a newer one is unknown, but a real reviewer explicitly rejected
another project on this exact basis ("fails contract lint because it
nests nondeterministic blocks... reorganize that flow into a supported
GenVM pattern"), so this is treated as a hard requirement rather than a
tool quirk to dismiss.

## Fixed since last review (2026-08-20, fifth pass) - steward review: sourcing, timing, custody, conservation

A GenLayer steward review requested more information, flagging four
concrete gaps: "several capital-moving decisions rely on party-authored
text or unrelated market data, while contract-side timing, vault custody,
and payout-conservation safeguards are incomplete." Each was independently
verified against the actual code (not assumed from the review's wording)
and fixed:

**1. Authoritative sourcing.** `PredictionMarket.create_market()` collected
a `resolution_sources` field but `resolve()` never fetched it - it was only
quoted as a text label in the prompt. `resolve()` now fetches it live via
`gl.nondet.web.get()` when it's a real URL and treats it as the primary
evidence, ahead of the (still-disclosed-as-secondary) CoinGecko freshness
check. Frontend hint updated to ask for a URL specifically.

**2. Timing enforcement.** Real, deterministic timestamps
(`datetime.now(timezone.utc)`, per `genlayer-docs`' transaction-context
page - pinned to the transaction's own datetime, identical across every
validator, no consensus needed) replace the empty `created_at`/`resolved_at`
strings everywhere. Three real gaps closed, not just cosmetic timestamps:
`PredictionMarket.propose_outcome()` now rejects proposals before the
stated deadline (previously unenforced entirely - flagged honestly in this
file's own prior version). `EscrowAdjudicator` gained
`reclaim_if_abandoned()` - if a provider never accepts or never delivers
before the deadline, the funder can reclaim directly; previously a
ghosting provider left funds stuck with no way back to the funder, for the
life of the contract. `CreditLine.open_line()` gained a `term_days`
parameter and a real `due_date` (starting when the line is actually
funded); `claim_default()` now rejects claims before it elapses -
previously a lender could claim default the instant after funding, with
zero grace period.

**3. Vault custody, the big one.** `VaultManager.move_to_*` used to release
mandate-approved capital to the vault owner's own wallet, on the belief
that cross-contract writes were broken on this GenVM build - the owner
then had to create the real instrument themselves, with zero onchain
enforcement they actually did. That belief was tested directly and found
wrong: `gl.get_contract_at(addr).emit(value=..., on='accepted').method(...)`
genuinely delivers, including value. (The earlier "broken" finding was a
false negative - checking state immediately after the caller's transaction
was accepted, without waiting for `emit()`'s own asynchronous follow-up
transaction.) `move_to_escrow`/`move_to_credit`/`move_to_prediction` now
fund the target instrument **directly** - real enforcement that the
mandate-approved capital is actually used for what it claims, not a
release-and-trust handoff.

Two more findings surfaced while building this, both load-bearing:

- A plain value-only transfer to another Intelligent Contract (the
  `_Recipient(...).emit_transfer()` mechanism every payout in this app
  uses) was confirmed to silently fail to deliver when the recipient is an
  IC instead of a real EOA - no error, no revert, value simply vanishes
  with no rescue path. This is why every `emit()`'d creation call passes
  an `on_behalf_of` parameter (added to `EscrowAdjudicator.create_escrow`,
  `CreditLine.fund_line`, `PredictionMarket.stake`) so the vault **owner's
  real EOA**, not `VaultManager`'s own address, is recorded as
  funder/lender/position-holder - refunds then flow through the same
  payout path already proven safe for every other user.
- A value-carrying *internal* `emit()` with `on='finalized'` was separately
  tested (an isolated two-contract pilot) and never delivered, even after
  30+ minutes across two attempts - while the identical call with
  `on='accepted'` delivered in seconds. `VaultManager` uses `on='accepted'`
  for this reason; its class docstring explains why the resulting tradeoff
  (a duplicate delivery is possible if this specific transaction is later
  appealed) is safe for the methods it calls.

**4. Payout conservation.** Working through `PredictionMarket`'s payout
math by hand (not just spot-checking that one test transaction paid out a
plausible-looking number) surfaced a real bug introduced during the
fourth-pass genvm-lint fix: forfeited challenge bonds were added directly
into `total_yes`/`total_no`, the same field used as the payout-share
*denominator* in `claim_winnings()`. That dilutes every individual
winner's proportional share instead of just adding to the pot they share -
concretely, with 100 winning stake / 50 forfeited bond / 200 losing stake,
the old formula only distributed 233 of the 350 GEN actually held,
permanently stranding 117 with no sweep path. Fixed with a separate
`bonus_pool` field, added to the payout numerator instead of the
denominator - verified by hand and live (100/50/200 example, and a real
600/200/400 on-chain test) to distribute the pool exactly, to the last
unit.

All four fixes verified live on Bradbury with real transactions, not just
reasoned about: `reclaim_if_abandoned()` returning locked capital to a
funder past deadline; `move_to_credit()` funding a real, separately-created
credit line with the vault owner (not `VaultManager`) landing as `lender`,
confirmed both via the line's own state and via `VaultManager`'s own
balance staying flat through a full repay cycle; `claim_default()`
rejecting a same-block default claim; and a full contested-market
resolution (600 YES / 400 NO / 200 forfeited challenge bond) where the
sole winner's `claim_winnings()` payout exactly absorbed the full 1200-unit
pool.

**Re-checked strictly against the review's own wording** ("*several*
capital-moving decisions rely on party-authored text") after the first
pass only fixed `PredictionMarket`: `CreditLine.resolve_default()` and
`VaultManager.resolve_movement()` were still adjudicating purely on
party-submitted prose plus the same generic, mostly-irrelevant CoinGecko
check. Closed the same way as `PredictionMarket` and `EscrowAdjudicator`:
`claim_default()` gained an optional `evidence_url`, `challenge_movement()`
gained an optional `evidence_url`, both fetched live inside
`resolve_default()`/`resolve_movement()` and weighed as primary evidence
over either party's own claims when present. Verified live on Bradbury: a
vault movement challenged with a real evidence URL (the project's own
README) resolved with `ai_reasoning` explicitly citing specific content
from the fetched page - not boilerplate. (First resolution attempt on this
test returned `NOT_VOTED`/never finalized - a transient consensus hiccup,
consistent with several other transient failures already documented in
this file's own findings and confirmed not code-related by simply
retrying, which resolved cleanly and quickly the second time.)

**Known remaining limitation, disclosed rather than silently left**:
`VaultManager`'s multi-depositor accounting is not perfectly fair under
partial deployment. `move_to_*` decrements the vault's aggregate
`treasury` but does not proportionally decrement each depositor's
individually-tracked `vault_deposits` entry. If a vault has multiple
depositors and the owner deploys only part of the pooled capital, every
depositor's *nominal* withdrawable balance still reads as their full
original deposit, while the *actual* live treasury is smaller - whoever
calls `withdraw_deposit()` first can claim up to their full nominal amount
(bounded by the real treasury, so nothing can be overdrawn beyond what's
actually held), not a proportional share. This does not enable theft or
fund loss - `withdraw_deposit()` is hard-capped at the real treasury - but
it is a first-come-first-served fairness gap among co-depositors of the
same vault, not a proportional-share (ERC4626-style) accounting model.
Fixing it properly needs a unit/share-based redesign of `vault_deposits`,
out of scope for this pass; flagged here rather than left for a reviewer
to discover.

## Known limitations (platform, not oversight)

- **Storage is `TreeMap[str, str]` with JSON-serialized values.**
  `@allow_storage`/`@dataclass` and non-`str` `TreeMap` value types were
  pilot-tested on this build and became permanently unreadable after a
  successful deploy. `TreeMap[str, str]` is the only pattern verified to
  read reliably here.
- **Internal `emit()` with `on='finalized'` and a value attached does not
  reliably deliver on this GenVM build** (see fifth-pass note above) -
  `on='accepted'` does, and is used instead wherever `VaultManager` needs
  to carry value into another contract. External EOA-style payouts (forced
  to `on='finalized'` by the platform) are unaffected.
- **A plain value transfer to another Intelligent Contract silently fails
  to deliver** when the recipient is an IC rather than a real EOA - no
  error, no revert, no rescue path. Every contract in this app is careful
  to only ever record a real human EOA (never another contract's own
  address) as a payout recipient, specifically because of this.

## How to run the tests

```bash
# Access-control test - a funded random wallet attempts every protected
# write and asserts each one reverts with FINISHED_WITH_ERROR, then re-reads
# state to confirm nothing changed.
node deploy/test-access-control.mjs

# End-to-end critical-path test - runs the full Performance Escrow lifecycle
# (create -> accept -> submit evidence -> resolve -> claim reputation) against
# live Bradbury contracts and asserts on real on-chain state at each step.
node deploy/test-e2e-escrow.mjs
```

Both scripts read `ACCOUNT_PRIVATE_KEY` from `deploy/.env` for the funded
owner/deployer account and generate their own ephemeral throwaway keypairs
for the "attacker" / counterparty roles, funding them with a small native
transfer from the owner account before use.
