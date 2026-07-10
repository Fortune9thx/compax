import { create } from "zustand";

export interface Vault {
  id: string;
  name: string;
  owner: string;
  strategy: "conservative" | "balanced" | "growth" | "custom";
  objective: string;
  risk_tolerance: number;
  treasury: number;
  allocation_lending: number;
  allocation_staking: number;
  allocation_predictions: number;
  allocation_builders: number;
  last_rebalance: string;
  last_rebalance_reason: string;
  total_yield: number;
  personality: "warren" | "quant" | "builder" | "opportunist" | string;
  created_at: string;
  deposit_count: number;
}

interface VaultState {
  vaults: Vault[];
  activeVault: Vault | null;
  isLoading: boolean;
  setVaults: (v: Vault[]) => void;
  setActiveVault: (v: Vault | null) => void;
  setLoading: (v: boolean) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  vaults: [],
  activeVault: null,
  isLoading: false,
  setVaults: (v) => set({ vaults: v }),
  setActiveVault: (v) => set({ activeVault: v }),
  setLoading: (v) => set({ isLoading: v }),
}));
