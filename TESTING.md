# Testing Compax on Bradbury

Copy-pasteable walkthrough for testing the live app. About 15 minutes for the full loop across all 5 contracts.

Live app: **https://compax-sepia.vercel.app**

---

## 1. Set up your wallet for Bradbury

Add a network manually in your EVM wallet (MetaMask, Rabby, Coinbase Wallet - any EIP-6963 wallet works, the app isn't MetaMask-only):

```
Network name:   GenLayer Bradbury Testnet
RPC URL:        https://rpc-bradbury.genlayer.com
Chain ID:       4221
Currency:       GEN
```

Get testnet GEN from the [Bradbury faucet](https://testnet-faucet.genlayer.foundation).

## 2. Connect

Open the app, click **Connect Wallet** in the top-right. If you have more than one wallet extension installed, you'll get a picker; otherwise it connects directly. If you're on the wrong network, the wallet will prompt a switch.

## 3. Create an escrow (the hero flow)

Go to **Escrows → New escrow**.

- **Provider**: any second address you control, or a friend's - must differ from your own.
- **Success criteria**: something concrete and checkable, e.g. *"Deliver a working README with setup instructions, pushed to a public GitHub repo."*
- **Deadline**: any date.
- **Amount**: however much testnet GEN you want to lock.

Submit - capital locks immediately. Watch the **DeliberationTheater**: five dots pulse while validators deliberate, then resolve to a checkmark once consensus is reached.

**As the provider** (switch wallets, or have your counterpart do it): open the escrow, click **Accept**, then **Submit evidence** with real text and at least one real URL.

**As anyone**: click **Resolve**. This takes 30–90 seconds - five validators are independently fetching the evidence URL live and reasoning over whether it satisfies the original criteria. Expand the DeliberationTheater afterward to see the exact reasoning, the evidence considered, and the live web data used.

If the outcome is anything but a full clawback, the provider receives real GEN - check your wallet balance.

## 4. Try a contested prediction market

Go to **Markets → New market** - ask a precise yes/no question with a real deadline.

Stake on both YES and NO from two different wallets (or ask a friend to take the other side). Once you're done staking, **propose an outcome** with evidence - anyone can do this, not just the creator. Optionally **challenge** the proposal from a different wallet with a bond and a reason it's wrong.

Click **Resolve**. The AI reasons the real answer fresh from the question and live data - it does not simply accept the proposal, and in our own testing it overruled the creator's own proposed outcome after weighing a challenge. If you were on the winning side, go back to the market page and click **Claim winnings**.

## 5. Open a credit line

Go to **Credit → Open a line** - state a purpose and post collateral. The AI sets a maximum loan (always less than your collateral) and an interest rate.

From a *different* wallet, click a line in the list, and **fund** it up to the max loan amount - that GEN goes straight to the borrower. As the borrower, you can either:
- **Repay** (principal + interest) - collateral returns to you in full, lender gets paid.
- Do nothing and let the lender **claim default** with evidence - you can then **dispute** with a rebuttal before anyone calls **resolve**, which splits the collateral based on how credible each side's case is.

## 6. Create a mandate vault, then challenge a capital movement

Go to **Vaults → New vault** - state an objective in your own words and a risk tolerance (1–10 slider). Which instrument types (escrow / prediction / credit) this vault can enter follows a transparent, deterministic rule from your risk tier (1-3 escrow only, 4-7 adds credit, 8-10 adds prediction) - not an AI decision, since a simple risk-tier lookup doesn't need consensus.

Deposit some GEN, then try **Move capital** to an instrument type your risk tier doesn't permit - it will be rejected onchain, not just hidden in the UI.

Now the real adjudication: move capital to an instrument type your tier *does* permit, writing a justification for why this specific move serves your stated objective. From a *different* wallet (or the same one, permissionless like everywhere else in this app), open that movement and **Challenge** it with a bond and a reason it doesn't actually serve the mandate. Click **Resolve** - five validators independently weigh your original objective, the justification, the challenge, and live market data, and decide compliant or violation. If the challenge is vindicated, the challenger's bond comes back; if not, it's forfeited to the vault owner - never just stuck.

Depositors (including the owner, who is just another depositor of their own vault) can reclaim their own undeployed capital at any time via **Withdraw** on the deposit card - nobody can withdraw money someone else deposited.

## 7. Check reputation

Go to **Reputation**, paste in the provider/lender/staker address from any of the above. After a resolved outcome, click **Claim reputation update** on the relevant escrow/market/line page - reputation is never updated automatically, it has to be pulled by a party or a keeper after resolution.

---

## What to look for as a tester

- **Every write shows a real deliberation** - five pulsing dots, then a genuine consensus result, not a fake progress bar.
- **Resolutions cite specifics** - expand the DeliberationTheater on any resolved item; the reasoning should reference the actual evidence/proposal/challenge you submitted, not generic boilerplate.
- **Mandate gates are real** - an instrument type the vault's mandate doesn't allow will reject the transaction, not just grey out a button.
- **Nothing is placeholder data** - if a number reads 0, the chain state is actually 0.

## Reporting issues

Open an issue at https://github.com/Fortune9thx/compax/issues with what you did, what you expected, what happened, and the tx hash once the deliberation indicator resolves.
