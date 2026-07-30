"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { CONTRACTS } from "@/lib/contracts";
import { _state } from "@/hooks/useWallet";

const POLL_INTERVAL = 15_000; // 15 seconds — polite for Bradbury rate limits

// Generic hook for sequential contract reads with real-time polling
export function useContractRead<T>(
  contract: keyof typeof CONTRACTS,
  method: string,
  args: unknown[] = [],
  fallback: T
): { data: T; loading: boolean; error: string | null; refetch: () => void; lastUpdated: number | null } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await readContract<T>(CONTRACTS[contract], method, args as never[]);
      const isEmpty =
        result === null ||
        result === undefined ||
        (Array.isArray(result) && result.length === 0) ||
        (typeof result === "object" && !Array.isArray(result) && Object.keys(result as object).length === 0);
      setData(isEmpty ? fallback : result);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(fallback);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract, method, JSON.stringify(args)]);

  useEffect(() => {
    fetch();
    timerRef.current = setInterval(fetch, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetch]);

  return { data, loading, error, refetch: fetch, lastUpdated };
}

// Write hook — signs via connected MetaMask wallet (client-side, no private key)
export function useContractWrite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      contract: keyof typeof CONTRACTS,
      method: string,
      args: unknown[] = [],
      value?: bigint
    ) => {
      const { address, connected, provider } = _state;
      if (!connected || !address) {
        throw new Error("Wallet not connected. Connect a wallet first.");
      }
      setLoading(true);
      setError(null);
      try {
        const result = await writeContract(address, CONTRACTS[contract], method, args, value, provider ?? undefined);
        return result;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { execute, loading, error };
}

// ─── Typed read hooks per contract ───

export function useAllVaults() {
  return useContractRead<VaultData[]>("VaultManager", "get_all_vaults", [], []);
}
export function useVault(id: string) {
  return useContractRead<VaultData | null>("VaultManager", "get_vault", [id], null);
}
export function useTotalTVL() {
  return useContractRead<number>("VaultManager", "get_total_tvl", [], 0);
}
export function useVaultCount() {
  return useContractRead<number>("VaultManager", "get_active_vault_count", [], 0);
}
/** Total autonomous allocation cycles the manager has run. */
export function useCycleCount() {
  return useContractRead<number>("VaultManager", "get_cycle_count", [], 0);
}
export function useRebalanceHistory(vaultId: string) {
  return useContractRead<RebalanceRecord[]>("VaultManager", "get_rebalance_history", [vaultId], []);
}

export function useAllEvents() {
  return useContractRead<EventData[]>("EconomicEvents", "get_all_events", [], []);
}
export function useActiveEvent() {
  return useContractRead<EventData | null>("EconomicEvents", "get_active_event", [], null);
}
export function useEventCount() {
  return useContractRead<number>("EconomicEvents", "get_event_count", [], 0);
}

export function useCanClaimFaucet(address: string) {
  return useContractRead<boolean>("ReputationSystem", "can_claim_faucet", [address], false);
}
export function useReputation(address: string) {
  return useContractRead<ScoreData>("ReputationSystem", "get_score", [address], DEFAULT_SCORE);
}
export function useRepHistory(address: string) {
  return useContractRead<RepEvent[]>("ReputationSystem", "get_history", [address], []);
}

export function useAllLoans() {
  return useContractRead<LoanData[]>("LendingMarket", "get_all_active_loans", [], []);
}
export function useTotalBorrowed() {
  return useContractRead<number>("LendingMarket", "get_total_borrowed", [], 0);
}
export function useLoanCount() {
  return useContractRead<number>("LendingMarket", "get_loan_count", [], 0);
}

export function useAllProjects() {
  return useContractRead<ProjectData[]>("BuilderFunding", "get_all_projects", [], []);
}
export function useTotalAllocated() {
  return useContractRead<number>("BuilderFunding", "get_total_allocated", [], 0);
}

export function useAllMarkets() {
  return useContractRead<MarketData[]>("PredictionMarkets", "get_all_markets", [], []);
}
export function useActiveMarkets() {
  return useContractRead<MarketData[]>("PredictionMarkets", "get_active_markets", [], []);
}
export function useTotalVolume() {
  return useContractRead<number>("PredictionMarkets", "get_total_volume", [], 0);
}
export function useMarketStake(marketId: string, address: string) {
  return useContractRead<{ position?: string; amount?: number; claimed?: boolean }>(
    "PredictionMarkets",
    "get_user_stake",
    [marketId, address],
    {},
  );
}

export function useAllStakes() {
  return useContractRead<StakePosition[]>("StakingReserve", "get_all_positions", [], []);
}
export function useUserStakes(address: string) {
  return useContractRead<StakePosition[]>("StakingReserve", "get_user_positions", [address], []);
}
export function useTotalStaked() {
  return useContractRead<number>("StakingReserve", "get_total_staked", [], 0);
}
export function useStakingApr() {
  return useContractRead<number>("StakingReserve", "get_current_apr", [], 0);
}
export function usePoolStats() {
  return useContractRead<PoolStats>("StakingReserve", "get_pool_stats", [], DEFAULT_POOL_STATS);
}

// ─── Types ───

export interface VaultData {
  id: string;
  name: string;
  owner: string;
  strategy: string;
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
  personality: string;
  created_at: string;
  deposit_count: number;
}

export interface RebalanceRecord {
  vault_id: string;
  old_lending: number;
  old_staking: number;
  old_predictions: number;
  old_builders: number;
  new_lending: number;
  new_staking: number;
  new_predictions: number;
  new_builders: number;
  reason: string;
  event_context: string;
  /** Raw CoinGecko payload the contract reasoned over. Proof, not decoration. */
  market_snapshot: string;
  /** Raw Fear & Greed payload the contract reasoned over. */
  sentiment_snapshot: string;
  /** "keeper" = autonomous cycle, "owner" = manually triggered. */
  triggered_by: string;
  timestamp: string;
}

export interface EventData {
  id: string;
  event_type: string;
  name: string;
  description: string;
  impact: string;
  severity: number;
  triggered_at: string;
  triggered_by: string;
  is_active: boolean;
}

export interface ScoreData {
  address: string;
  total_score: number;
  loan_score: number;
  funding_score: number;
  prediction_score: number;
  vault_score: number;
  total_actions: number;
}

const DEFAULT_SCORE: ScoreData = {
  address: "", total_score: 500, loan_score: 0,
  funding_score: 0, prediction_score: 0, vault_score: 0, total_actions: 0,
};

export interface RepEvent {
  action: string;
  delta: number;
  reason: string;
  timestamp: string;
}

export interface StakePosition {
  id: string;
  staker: string;
  amount: number;
  apr_bps: number;
  tier: string;
  status: string;
  ai_reasoning: string;
  staked_at: string;
  unstaked_at: string;
}

export interface PoolStats {
  total_staked: number;
  current_apr_bps: number;
  active_positions: number;
  unique_stakers: number;
  total_positions: number;
}

const DEFAULT_POOL_STATS: PoolStats = {
  total_staked: 0, current_apr_bps: 0, active_positions: 0,
  unique_stakers: 0, total_positions: 0,
};

export interface LoanData {
  id: string;
  borrower: string;
  amount: number;
  interest_rate_bps: number;
  duration_days: number;
  purpose: string;
  description: string;
  status: string;
  ai_reasoning: string;
  risk_score: number;
  requested_at: string;
  due_at: string;
}

export interface ProjectData {
  id: string;
  applicant: string;
  name: string;
  description: string;
  funding_requested: number;
  funding_allocated: number;
  expected_outcome: string;
  timeline_weeks: number;
  status: string;
  ai_reasoning: string;
  conditions: string;
  submitted_at: string;
  decided_at: string;
}

export interface MarketData {
  id: string;
  creator: string;
  question: string;
  resolution_date: string;
  total_yes: number;
  total_no: number;
  status: string;
  outcome: string;
  created_at: string;
  resolved_at: string;
  resolution_reasoning: string;
}
