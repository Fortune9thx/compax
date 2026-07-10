import { create } from "zustand";

export interface EconomicEvent {
  id: string;
  event_type: "bull_market" | "credit_crunch" | "liquidity_crisis" | "ai_boom" | "protocol_exploit" | string;
  name: string;
  description: string;
  impact: string;
  severity: number;
  triggered_at: string;
  triggered_by: string;
  is_active: boolean;
}

interface EventState {
  activeEvent: EconomicEvent | null;
  history: EconomicEvent[];
  isLoading: boolean;
  setActiveEvent: (e: EconomicEvent | null) => void;
  setHistory: (h: EconomicEvent[]) => void;
  setLoading: (v: boolean) => void;
}

export const useEventStore = create<EventState>((set) => ({
  activeEvent: null,
  history: [],
  isLoading: false,
  setActiveEvent: (e) => set({ activeEvent: e }),
  setHistory: (h) => set({ history: h }),
  setLoading: (v) => set({ isLoading: v }),
}));
