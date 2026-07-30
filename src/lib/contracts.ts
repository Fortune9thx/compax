// All 7 contracts redeployed to GenLayer Bradbury testnet 2026-07-30
// (pagination added to every unbounded get_all_*/history view method,
// offset/limit params default to prior full-list behavior). Keeper
// (deployer) re-registered on the new VaultManager.
// Correct header: # { "Depends": "py-genlayer:..." } — no version prefix
// All txs: ACCEPTED + AGREE + FINISHED_WITH_RETURN (verified via getTransaction)
export const CONTRACTS = {
  EconomicEvents:    "0x029619b9099f542bB858CEbB41D3bC1cf2e87281" as `0x${string}`,
  ReputationSystem:  "0x972989090981eaB85a01FE99FfB8D214c1870F33" as `0x${string}`,
  LendingMarket:     "0x6816269DA605941F6C71bbCc5C60CAB246AB39Cb" as `0x${string}`,
  BuilderFunding:    "0x4406d3DB9E6b325fB7f62413F345F305c1907b30" as `0x${string}`,
  PredictionMarkets: "0x7DdE3cE13a2E0E95E031679CD3D6253637eDC59b" as `0x${string}`,
  VaultManager:      "0xd37e61f9862cC7618e39FD7363eF22bCbDb68c8C" as `0x${string}`,
  // 7th contract — backs the allocation_staking sleeve.
  StakingReserve:    "0xf96B4b4E9FA17701d27CA3470c9cAF1d291e61F6" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
