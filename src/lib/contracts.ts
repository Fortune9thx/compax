// Deployed to GenLayer Bradbury testnet 2026-07-28 (v0.2.16 header, verified against vigil/agora)
export const CONTRACTS = {
  EconomicEvents:    "0x0A0B3d231c24a758cd4291610Ed300f5363b6904" as `0x${string}`,
  ReputationSystem:  "0x77d31AEb1D636C5e1eF8806f40D40AeAaCC7bbA0" as `0x${string}`,
  LendingMarket:     "0x2ead7702e37EFFB63655E03f15Aaac313bca7CC2" as `0x${string}`,
  BuilderFunding:    "0xe8a001EFa9fF8269696D7e4B4e0d68B7A7DC2C3c" as `0x${string}`,
  PredictionMarkets: "0x2233308BB8003Ae7C9c7cc6031136ECFa38f024E" as `0x${string}`,
  VaultManager:      "0xa2706B27E38af4C45B1b2900Cb55c3695b57d75A" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
