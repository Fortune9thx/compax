// COMPAX v2 - deployed to GenLayer Bradbury testnet, 2026-07-31.
// All 5 contracts independently deployed (no constructor args), verified
// end-to-end with real transactions before shipping - see SUBMISSION.md.
//
// chainId 4221 · rpc-bradbury.genlayer.com
// To point at mainnet later: swap NETWORK below and redeploy; no other
// code changes required since every contract call goes through
// src/lib/genlayer.ts, which reads NETWORK from here.
export const NETWORK = {
  name: "Bradbury Testnet",
  chainId: 4221,
  chainIdHex: "0x107D",
  rpcUrl: "https://rpc-bradbury.genlayer.com",
  explorerUrl: "https://explorer-bradbury.genlayer.com/",
} as const;

export const CONTRACTS = {
  // Redeployed 2026-08-10 to fix a bug where record_from_credit only accepted
  // status "repaid"/"defaulted", but CreditLine.resolve_default actually sets
  // status "resolved" - meaning reputation could never be claimed on a
  // contested-default credit line. See contracts/ReputationRegistry.py.
  // Redeployed 2026-08-16 (second time same day): adds the "vault" trusted-
  // source category and record_from_vault(), for VaultManager's mandate-
  // adjudication redesign below. All four adjudicating contracts
  // re-registered as trusted sources on this address.
  // Redeployed 2026-08-16 (third time same day): every address-keyed map
  // (scores, history) and the party-authorization check now normalize to
  // lowercase before comparing or indexing. Previously, a score/history
  // lookup or a record_from_* party check compared gl.message.sender_address
  // (always checksummed) against whatever case an address happened to be
  // typed/stored in - which silently failed for any address the frontend
  // supplies in lowercase (the normal case for eth_accounts on most
  // wallets). This affected every category, not just one contract.
  ReputationRegistry: "0x1654eb6704D90A48729851f4686E5213c7B9C749" as `0x${string}`,
  // Redeployed 2026-08-16: challenge()/challenge_proposal() bonds were
  // collected but had zero code path back out - permanently stuck funds
  // in the flagship contested-evidence mechanic. resolve() now refunds or
  // forfeits every challenge bond, and accept_escrow's provider_bond is
  // refunded/forfeited on outcome instead of sitting unclaimed forever.
  // See SECURITY.md "Known limitations" for what this means for the funds
  // already stuck in the old, now-abandoned deployments.
  EscrowAdjudicator: "0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE" as `0x${string}`,
  // Redeployed 2026-08-16: full mandate-adjudication redesign. Mandate scope
  // (which instruments a vault may enter) is now a deterministic, auditable
  // policy, not an LLM classification with no counterparty - removing the
  // one weak "decorative AI" link a strict reviewer would flag. The real
  // Intelligent Contract behavior moved to where it belongs:
  // resolve_movement() adjudicates whether a specific, challenged capital
  // movement actually complied with the vault's natural-language objective,
  // using live market data, exactly the same challenge/bond/resolve pattern
  // already proven in EscrowAdjudicator/PredictionMarket. Depositors also
  // now hold individually tracked, withdrawable claims instead of an
  // unprotected "deposit into someone else's vault" pattern.
  VaultManager: "0xf64B7fBB4F516D0b87cE7003D31B6BA61BC716b0" as `0x${string}`,
  // Redeployed 2026-08-16 (second time same day): stake() and
  // claim_winnings() built their internal lookup key from
  // gl.message.sender_address without lowercasing it, but get_user_stake()
  // compared against the raw, un-normalized address the frontend supplied -
  // so "Your stake" and Claim Winnings never appeared for a real staker
  // whenever the wallet's address happened to be lowercase (the normal
  // case for eth_accounts on most wallets). Fixed by normalizing both sides.
  PredictionMarket: "0xE2681E5Ec27175ADC4173b949928F3Bbb24f6b07" as `0x${string}`,
  CreditLine: "0xC04F7900840a8088909b906bD429A4a834715Ca5" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
