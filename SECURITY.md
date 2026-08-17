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

## Known limitations (platform, not oversight)

- **Cross-contract writes silently no-op on this Bradbury GenVM build.**
  Confirmed via pilot testing, not assumed. This is why reputation is
  pull-based and why `VaultManager.move_to_*` releases capital to the vault
  owner's own wallet rather than atomically funding a new instrument.
- **No verified onchain wall-clock.** No contract here can check "has this
  deadline passed" - every deadline field is stored as free text and
  enforced procedurally (the keeper, or any caller, choosing not to call
  `resolve()`/`propose_outcome()` before the stated deadline).
- **Storage is `TreeMap[str, str]` with JSON-serialized values.**
  `@allow_storage`/`@dataclass` and non-`str` `TreeMap` value types were
  pilot-tested on this build and became permanently unreadable after a
  successful deploy. `TreeMap[str, str]` is the only pattern verified to
  read reliably here.

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
