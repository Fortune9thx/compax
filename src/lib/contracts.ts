// COMPAX v2 - deployed to GenLayer Bradbury testnet.
// All 5 contracts independently deployed (no constructor args), verified
// end-to-end with real transactions before shipping - see SUBMISSION.md.
// Full changelog of every redeploy and why: SECURITY.md "Fixed since last
// review" sections.
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

// Current as of 2026-08-20, fifth redeploy: real financial-invariant and
// custody fixes raised by a GenLayer steward review - see SECURITY.md
// "Fixed since last review (fifth pass)". All 5 contracts and all four
// trusted-source registrations verified live post-deploy.
export const CONTRACTS = {
  ReputationRegistry: "0x2AA037b22C60A4B741bE0A327ab3fBF8111Aa654" as `0x${string}`,
  EscrowAdjudicator: "0xEbb35Ee78426f96D94826A8368cf233947AA3Ab0" as `0x${string}`,
  VaultManager: "0x6603A01C16c1F865A33c36389F19D0537E94806d" as `0x${string}`,
  PredictionMarket: "0xA94D7d2af016DC4A984546150C651b27d7fb5159" as `0x${string}`,
  CreditLine: "0x961CDf9C1a870D1FCa71b7C31A54087bBaD71D67" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
