# Contract Deployment Order

All 5 contracts are independent - none take constructor arguments and none call each other automatically at deploy time (see the cross-contract-call limitation note below). Deploy in any order.

```bash
node deploy/deploy.mjs
```

This deploys all 5 in sequence, verifies each is readable, and then registers `EscrowAdjudicator`, `PredictionMarket`, `CreditLine`, and `VaultManager` as trusted sources on `ReputationRegistry` (owner-gated `add_trusted_source`). After deploying, update `src/lib/contracts.ts` with the printed addresses.

## Cross-contract calls on this GenVM build

**Corrected 2026-08-20** - an earlier note here claimed cross-contract write calls were broken. That was a false negative: the original test checked the target's state immediately after the caller's transaction was ACCEPTED, without waiting for `emit()`'s own separate follow-up transaction (per `genlayer-docs`' messages page, `emit()` is explicitly asynchronous - it queues a child transaction that executes *after* the caller's tx completes, not inline). Re-tested properly with patient polling for that child transaction: `gl.get_contract_at(addr).emit(value=..., on='finalized').method(args)` **works**, including value-carrying calls. `.view()` reads were already known to work.

**What is genuinely broken, empirically confirmed 2026-08-20**: a plain value-only transfer to another Intelligent Contract via the EOA/EVM-external mechanism (`@gl.evm.contract_interface` + `_Recipient(Address(addr)).emit_transfer(value=...)` - the exact pattern every payout in this app uses for refunds/repayments/winnings/bonds) silently fails to deliver when the recipient is an IC rather than a real EOA. No error, no revert - the value is deducted from the sender and simply never arrives anywhere, confirmed via both the target's application state and its raw EVM-layer balance. This is why `VaultManager` never becomes the funder/lender/staker of record on another contract (see below) - any refund owed back to it would be silently, permanently stranded.

Reputation updates are still **pull-based** by deliberate choice, not because push is broken (it now demonstrably works via the value-carrying `emit()` pattern above): `EscrowAdjudicator`, `PredictionMarket`, `CreditLine`, and `VaultManager` still never call `ReputationRegistry` directly. After an instrument resolves, a party to it (or a registered keeper) calls `ReputationRegistry.record_from_escrow` / `record_from_prediction` / `record_from_credit` / `record_from_vault`, passing the source contract's address and the instrument's (or movement's) id. `ReputationRegistry` reads the resolved state itself via `.view()`, verifies it's actually finalized, and only then applies a reasoned score delta. `add_trusted_source` still has to be run after deploy - `ReputationRegistry` only trusts state read from contract addresses the owner has explicitly registered, so a fake contract can't fabricate a "resolved" outcome to pump a score. This design is unaffected by the correction above and was left as-is.

**Narrower correction, same day**: a value-carrying internal `emit()` (`gl.get_contract_at(addr).emit(value=..., on=...).method(...)`) with `on='finalized'` was tested directly (isolated two-contract pilot, no other logic involved) and never delivered - the child transaction simply never materialized, even after 30+ minutes of patient polling across two separate attempts. The identical call with `on='accepted'` delivered correctly within seconds, both for a plain method call and a value-carrying one. External EOA-style payouts (`_Recipient(...).emit_transfer(...)`, which the platform forces to `on='finalized'` and cannot use `on='accepted'`) are unaffected and continue to work normally, as proven throughout this app's payout paths - the failure is specific to *internal* `finalized` emits carrying value. `VaultManager` uses `on='accepted'` for this reason; see its class docstring for why that tradeoff (a duplicate message can theoretically fire if the parent transaction is later appealed and re-executed) is safe for the specific methods it calls.

`VaultManager.move_to_escrow` / `move_to_credit` / `move_to_prediction` now fund the target instrument **directly**, via a value-carrying `emit()` call into `EscrowAdjudicator.create_escrow` / `CreditLine.fund_line` / `PredictionMarket.stake` - real custody enforcement, not a release-and-trust handoff to the owner's own wallet. Each of those three target methods accepts an `on_behalf_of` parameter so the vault **owner's real EOA**, not `VaultManager`'s own contract address, is recorded as funder/lender/position-holder - required precisely because of the stranded-value risk described above. `credit`/`prediction` movements pre-check the target via `.view()` (line is open and within its max loan; market is active) before committing any value, since a value-carrying `emit()` that reverts downstream does not return its value to the sender. `move_to_escrow` still can't get a synchronous return value back (the created escrow's id) because `emit()` is asynchronous - the new escrow appears on `EscrowAdjudicator` shortly after, funded by the vault owner. Any depositor can still challenge a specific move against the vault's stated objective via `challenge_movement()`; `resolve_movement()` remains VaultManager's real Intelligent Contract behavior - a genuinely contested judgment, not the deterministic mandate-scope rule.

## Registering trusted sources manually

If you redeploy just one adjudicating contract later (not all 5), re-register it:

```js
await client.writeContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  functionName: "add_trusted_source",
  args: [NEW_CONTRACT_ADDRESS, "escrow" /* or "prediction" / "credit" / "vault" */],
  value: 0n,
});
```

Then verify with `is_trusted_source(address, category)` before relying on it - registration writes on Bradbury have a propagation lag (a read immediately after ACCEPTED can still show stale state for up to ~2 minutes).
