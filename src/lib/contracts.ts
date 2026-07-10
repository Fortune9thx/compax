// Deployed to GenLayer Bradbury testnet 2026-07-09 (rewritten for Bradbury compatibility)
export const CONTRACTS = {
  EconomicEvents:    "0x5a9AeE83e082fE87742e0a8d8105888d192e96c9" as `0x${string}`,
  ReputationSystem:  "0x6e03d11d9427E0Dc2cA4Ec06FC19537c20aD1027" as `0x${string}`,
  LendingMarket:     "0xD28e774e77fa01Ce0bF42E82Dd899De3E90a7e0a" as `0x${string}`,
  BuilderFunding:    "0x003Ba87D5FC79653FEC4E75Af234BB5495193200" as `0x${string}`,
  PredictionMarkets: "0xD708C9e308C7eeb2788218470175BD96f4fB9D84" as `0x${string}`,
  VaultManager:      "0xd167F20348ff191E119D974FfaD746dBE052c51a" as `0x${string}`,
} as const;

export type ContractName = keyof typeof CONTRACTS;
