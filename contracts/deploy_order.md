# Contract Deployment Order

All 5 contracts are independent - none take constructor arguments and none call each other automatically at deploy time (see the cross-contract-call limitation note below). Deploy in any order.

```bash
node deploy/deploy.mjs
```

This deploys all 5 in sequence, verifies each is readable, and then registers `EscrowAdjudicator`, `PredictionMarket`, and `CreditLine` as trusted sources on `ReputationRegistry` (owner-gated `add_trusted_source`). After deploying, update `src/lib/contracts.ts` with the printed addresses.

## Cross-contract calls on this GenVM build

Cross-contract **write** calls (`gl.get_contract_at(addr).emit(on=...).method(args)`) are confirmed broken on Bradbury as of 2026-07-31 - the calling contract's transaction accepts normally, but the target contract's state never actually changes, silently. Cross-contract **reads** (`gl.get_contract_at(addr).view().method(args)`) work correctly.

This is why reputation updates are **pull-based**: `EscrowAdjudicator`, `PredictionMarket`, and `CreditLine` never call `ReputationRegistry` directly. Instead, after an instrument resolves, a party to it (or a registered keeper) calls `ReputationRegistry.record_from_escrow` / `record_from_prediction` / `record_from_credit`, passing the source contract's address and the instrument's id. `ReputationRegistry` reads the resolved state itself via `.view()`, verifies it's actually finalized, and only then applies a reasoned score delta. This is why `add_trusted_source` has to be run after deploy - `ReputationRegistry` only trusts state read from contract addresses the owner has explicitly registered, so a fake contract can't fabricate a "resolved" outcome to pump a score.

Same root cause is why `VaultManager.move_to_escrow` / `move_to_prediction` / `move_to_credit` don't atomically fund a brand-new instrument in one transaction - they enforce the vault's mandate (can it commit capital to this instrument type at all) and release the capital to the vault owner's own wallet via a plain value transfer, and the owner then creates the real escrow/market/credit-line themselves as a separate transaction.

## Registering trusted sources manually

If you redeploy just one adjudicating contract later (not all 5), re-register it:

```js
await client.writeContract({
  address: REPUTATION_REGISTRY_ADDRESS,
  functionName: "add_trusted_source",
  args: [NEW_CONTRACT_ADDRESS, "escrow" /* or "prediction" / "credit" */],
  value: 0n,
});
```

Then verify with `is_trusted_source(address, category)` before relying on it - registration writes on Bradbury have a propagation lag (a read immediately after ACCEPTED can still show stale state for up to ~2 minutes).
