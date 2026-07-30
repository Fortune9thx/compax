# Testing Compax on Bradbury

Copy-pasteable walkthrough for testing the live app. Takes about 10 minutes for the full loop.

Live app: **https://compax-sepia.vercel.app**

---

## 1. Set up MetaMask for Bradbury

Open MetaMask → **Add network manually** → enter:

```
Network name:      GenLayer Bradbury Testnet
New RPC URL:        https://rpc-bradbury.genlayer.com
Chain ID:            4221
Currency symbol:     GEN
```

If you already have a Bradbury-funded account, skip to step 2. If not, get testnet GEN from the [GenLayer Bradbury faucet](https://testnet-faucet.genlayer.foundation) (needed for gas and for deposits/loans/stakes — see the note in step 3 below).

## 2. Connect your wallet

Open **https://compax-sepia.vercel.app**, click **Connect wallet** in the top rail. If MetaMask is on the wrong network, the app will prompt a network switch to Bradbury automatically.

## 3. Activate your reputation record

Go to `/reputation` or `/faucet` → **Activate**. This is a one-time, per-address write (`ReputationSystem.claim_cgen`) that initializes your onchain reputation record — it does **not** transfer any cGEN to your wallet, despite the method's name. Confirm the transaction in MetaMask, wait for the deliberation indicator to resolve to **Accepted**. The actual testnet GEN you use for deposits/loans/stakes comes from the [Bradbury faucet](https://testnet-faucet.genlayer.foundation) in step 1.

## 4. Create a vault

Go to `/vaults` → **Create vault**.

- **Name**: anything, e.g. `Test Vault 1`
- **Strategy**: pick one of `conservative` / `growth` / `balanced` / `institutional`
- **Objective**: a one-sentence mandate, e.g. `"Grow steadily with moderate risk over 12 months."`
- **Risk tolerance**: 1–10

Submit. This calls `VaultManager.create_vault`, which runs a real LLM reasoning pass (`gl.eq_principle.prompt_non_comparative`) to set the vault's *initial* allocation from your objective/strategy/risk — not a lookup table. Wait for consensus, then open the vault.

## 5. Deposit and rebalance

On the vault detail page:

- **Deposit** some cGEN into the vault.
- Click **Rebalance**. This asks `VaultManager.rebalance_vault` to fetch live CoinGecko prices + the Fear & Greed index, reason over them, and reallocate. This can take 30–90 seconds — five validators are independently evaluating the same LLM call and reaching consensus.
- Check the **History** tab afterward: each decision row is expandable and shows the reasoning, the raw market/sentiment data it actually read, and the full allocation shift.

## 6. Request a loan

Go to `/lending` → submit a loan request (amount, duration, purpose, description). `LendingMarket.request_loan` reasons approval/rate/risk from live market data — you'll see the AI's reasoning attached to the loan record on the book.

## 7. Submit a builder funding proposal

Go to `/builders` → submit a project (name, description, funding requested, expected outcome, timeline). `BuilderFunding.submit_project` reasons fund/reject/partial.

## 8. Create and stake on a prediction market

Go to `/predictions` → create a market (a yes/no question) or stake cGEN on an existing one.

## 9. Stake in the reserve

Go to `/staking` → stake cGEN. `StakingReserve` assigns your position a yield band and validator tier from live market context.

## 10. Check your reputation

Go to `/reputation` → your address should show updated sector scores after any of the above actions that route through `ReputationSystem` (loan repayment, funding repayment, prediction resolution, vault performance).

---

## What to look for as a tester

- **Every write should show a deliberation indicator** (`Validators deliberating` → `Consensus reached · AGREE`) before the UI updates — this is real: five GenLayer validators are independently evaluating the same LLM call.
- **Every AI decision should have visible reasoning** attached to the resulting record (loan, project, rebalance, event) — not just a status flag.
- **Nothing should be hardcoded or fake** — if a number reads 0, it's because the chain state is actually 0, not a placeholder. Empty states say so explicitly ("No vaults yet," etc.) instead of showing sample data.
- If the app shows a degraded/syncing banner, that means a read failed (RPC hiccup) — retry, don't assume it's broken.

## Reporting issues

Open an issue at https://github.com/Fortune9thx/compax/issues with: what you did, what you expected, what happened, and the tx hash if a write was involved (visible in the deliberation indicator once it resolves).
