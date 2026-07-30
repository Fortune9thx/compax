// VaultManager, StakingReserve, PredictionMarkets redeployed 2026-07-30 with
// real settlement: withdraw/unstake/claim_winnings now actually pay out via
// the verified _Recipient(Address).emit_transfer() pattern (docs.genlayer.com
// /developers/intelligent-contracts/advanced-features/value-transfers).
// Keeper (deployer) re-registered on the new VaultManager.
// Correct header: # { "Depends": "py-genlayer:..." } — no version prefix
// All txs: ACCEPTED + AGREE + FINISHED_WITH_RETURN (verified via getTransaction)
export const CONTRACTS = {
  EconomicEvents:    "0x029619b9099f542bB858CEbB41D3bC1cf2e87281" as `0x${string}`,
  ReputationSystem:  "0x972989090981eaB85a01FE99FfB8D214c1870F33" as `0x${string}`,
  LendingMarket:     "0x6816269DA605941F6C71bbCc5C60CAB246AB39Cb" as `0x${string}`,
  BuilderFunding:    "0x4406d3DB9E6b325fB7f62413F345F305c1907b30" as `0x${string}`,
  PredictionMarkets: "0xC05D520Af05358f924B124D8cf0f13bd757CbAF1" as `0x${string}`,
  VaultManager:      "0xD51CC631F9Bc3cA3507388bBBCcC6BD063e84e75" as `0x${string}`,
  // 7th contract — backs the allocation_staking sleeve.
  StakingReserve:    "0x9bD81Dd88C373c13Bc028497f45A371FF75765BB" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
