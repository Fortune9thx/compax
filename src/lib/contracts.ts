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

// Current as of 2026-08-16, fourth redeploy of the day: fixed a genvm-lint
// failure present in all 5 contracts (multiple/lambda-based non-deterministic
// blocks per write method are rejected by GenVM's lint tool - see
// SECURITY.md "Fixed since last review (fourth pass)"). All 5 contracts and
// all four trusted-source registrations verified live post-deploy.
export const CONTRACTS = {
  ReputationRegistry: "0xFffD427a00E09f6a1F0E896B1B85EC886bC10483" as `0x${string}`,
  EscrowAdjudicator: "0x95b12ecc4087DD49694a5F2ad8788C9bb350B428" as `0x${string}`,
  VaultManager: "0xdCB85486089582295E6Fdb537Cbb0fF88e5B4b93" as `0x${string}`,
  PredictionMarket: "0xD75F83263bDc7D7C04F755A9db849c25Ee47d207" as `0x${string}`,
  CreditLine: "0xEF190d82F1B6afDc7437A7B623A98F3e63Fc733f" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
