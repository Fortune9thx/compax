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
  ReputationRegistry: "0x959F078FC466AB57204BBB8F0Cf04CE08C074EaD" as `0x${string}`,
  EscrowAdjudicator: "0x44d0efE9E1d8529f4295C8EBE7c6426F7e1493EC" as `0x${string}`,
  VaultManager: "0x0815b09F89C97807c50e9fB2aa2744E21C895122" as `0x${string}`,
  PredictionMarket: "0x040CAb1ae474C6d775367734D13c903992b1806B" as `0x${string}`,
  CreditLine: "0xC04F7900840a8088909b906bD429A4a834715Ca5" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
