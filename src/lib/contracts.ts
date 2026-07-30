// VaultManager, StakingReserve, PredictionMarkets redeployed 2026-07-30 with
// real settlement: withdraw/unstake/claim_winnings now actually pay out via
// the verified _Recipient(Address).emit_transfer() pattern (docs.genlayer.com
// /developers/intelligent-contracts/advanced-features/value-transfers).
// LendingMarket + BuilderFunding redeployed the same day with an
// owner-fundable cGEN pool (fund_pool, get_pool_balance): approved loans
// and grants now actually disburse, capped by pool solvency. Both pools
// seeded with 100,000 cGEN from the owner/deployer account.
// Keeper (deployer) re-registered on the new VaultManager.
// Correct header: # { "Depends": "py-genlayer:..." } — no version prefix
// All txs: ACCEPTED + AGREE + FINISHED_WITH_RETURN (verified via getTransaction)
export const CONTRACTS = {
  EconomicEvents:    "0x029619b9099f542bB858CEbB41D3bC1cf2e87281" as `0x${string}`,
  ReputationSystem:  "0x972989090981eaB85a01FE99FfB8D214c1870F33" as `0x${string}`,
  LendingMarket:     "0x5baDe34F61FEC6B9Cf4E6eb51411D0e91aB7Fd2f" as `0x${string}`,
  BuilderFunding:    "0x4724f2743bC4d6d87D0611Fb5a75064a4762790A" as `0x${string}`,
  PredictionMarkets: "0xC05D520Af05358f924B124D8cf0f13bd757CbAF1" as `0x${string}`,
  VaultManager:      "0xD51CC631F9Bc3cA3507388bBBCcC6BD063e84e75" as `0x${string}`,
  // 7th contract — backs the allocation_staking sleeve.
  StakingReserve:    "0x9bD81Dd88C373c13Bc028497f45A371FF75765BB" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
