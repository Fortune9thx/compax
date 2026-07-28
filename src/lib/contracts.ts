// Deployed to GenLayer Bradbury testnet 2026-07-28 (web-aware v2, security hardened)
export const CONTRACTS = {
  EconomicEvents:    "0xed7D7E72d022A5951bA5D709672eDc89f1b4A53e" as `0x${string}`,
  ReputationSystem:  "0x1b9B7f8fC88c1cb627521Ab6df5aE78BC37bc398" as `0x${string}`,
  LendingMarket:     "0xF325084DD7Ab7ab4b2abFFFbb4c40AF2F01ca23E" as `0x${string}`,
  BuilderFunding:    "0x8194a3fA346733eC68e96ea0C2AfC6cD903222Ac" as `0x${string}`,
  PredictionMarkets: "0x82f9B99d8B1AB6a60674d6EEa74A199279F28B7a" as `0x${string}`,
  VaultManager:      "0xb62CD2decc7926CB7e108A48584754c24599B2Ee" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
