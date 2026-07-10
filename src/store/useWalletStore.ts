import { create } from "zustand";

interface WalletState {
  address: string | null;
  cgenBalance: number;
  rgenScore: number;
  isConnecting: boolean;
  connect: (address: string) => void;
  disconnect: () => void;
  setCgenBalance: (v: number) => void;
  setRgenScore: (v: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  cgenBalance: 0,
  rgenScore: 500,
  isConnecting: false,
  connect: (address) => set({ address }),
  disconnect: () => set({ address: null, cgenBalance: 0, rgenScore: 500 }),
  setCgenBalance: (v) => set({ cgenBalance: v }),
  setRgenScore: (v) => set({ rgenScore: v }),
}));
