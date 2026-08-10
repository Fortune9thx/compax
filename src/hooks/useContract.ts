"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { readContract, writeContract } from "@/lib/genlayer";
import { CONTRACTS } from "@/lib/contracts";
import { _state } from "@/hooks/useWallet";

const POLL_INTERVAL = 15_000;

// ─── generic read/write plumbing ────────────────────────────────────────

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

export function useContractWrite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (contract: keyof typeof CONTRACTS, method: string, args: unknown[] = [], value?: bigint) => {
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

// ─── types ──────────────────────────────────────────────────────────────

export interface ReputationScore {
  address: string;
  total_score: number;
  escrow_score: number;
  prediction_score: number;
  credit_score: number;
  total_actions: number;
}
const DEFAULT_SCORE: ReputationScore = {
  address: "", total_score: 500, escrow_score: 0, prediction_score: 0, credit_score: 0, total_actions: 0,
};
export interface ReputationEvent {
  category: "escrow" | "prediction" | "credit";
  delta: number;
  reason: string;
  timestamp: string;
}

export interface EvidenceEntry {
  submitter: string;
  text: string;
  urls: string[];
}
export interface Escrow {
  id: string;
  funder: string;
  provider: string;
  amount: number;
  criteria: string;
  deadline: string;
  required_evidence_types: string;
  status: "open" | "accepted" | "evidence_submitted" | "challenged" | "resolved";
  evidence: EvidenceEntry[];
  outcome: "" | "full_release" | "partial" | "clawback";
  released_amount: number;
  ai_reasoning: string;
  evidence_snapshot: string;
  web_data_snapshot: string;
  provider_bond: number;
  created_at: string;
  resolved_at: string;
}
export interface EscrowChallenge {
  challenger: string;
  reason: string;
  bond: number;
  refunded: boolean;
}

export interface Vault {
  id: string;
  owner: string;
  name: string;
  objective: string;
  risk_tolerance: number;
  personality: string;
  treasury: number;
  allowed_instruments: ("escrow" | "prediction" | "credit")[];
  mandate_reasoning: string;
  deposit_count: number;
  status: string;
  created_at: string;
}

export interface Market {
  id: string;
  creator: string;
  question: string;
  resolution_sources: string;
  deadline: string;
  total_yes: number;
  total_no: number;
  status: "active" | "proposed" | "challenged" | "resolved";
  proposed_outcome: "" | "yes" | "no";
  proposed_by: string;
  proposed_evidence: string;
  outcome: "" | "yes" | "no";
  resolution_reasoning: string;
  web_data_snapshot: string;
  created_at: string;
  resolved_at: string;
}
export interface MarketStake {
  position?: "yes" | "no";
  amount?: number;
  claimed?: boolean;
}
export interface MarketChallenge {
  challenger: string;
  reason: string;
  bond: number;
}

export interface CreditLineData {
  id: string;
  borrower: string;
  collateral_amount: number;
  purpose: string;
  max_loan_amount: number;
  interest_rate_bps: number;
  ai_terms_reasoning: string;
  status: "open" | "funded" | "repaid" | "default_claimed" | "disputed" | "resolved";
  lender: string;
  loan_amount: number;
  default_evidence: string;
  borrower_rebuttal: string;
  collateral_to_lender: number;
  collateral_to_borrower: number;
  ai_reasoning: string;
  created_at: string;
  resolved_at: string;
}

// ─── ReputationRegistry ──────────────────────────────────────────────────

export function useReputationScore(address: string) {
  return useContractRead<ReputationScore>("ReputationRegistry", "get_score", [address], DEFAULT_SCORE);
}
export function useReputationHistory(address: string, offset = 0, limit = 100) {
  return useContractRead<ReputationEvent[]>("ReputationRegistry", "get_history", [address, offset, limit], []);
}
export function useIsTrustedSource(address: string, category: string) {
  return useContractRead<boolean>("ReputationRegistry", "is_trusted_source", [address, category], false);
}

// ─── EscrowAdjudicator ───────────────────────────────────────────────────

export function useEscrow(escrowId: string) {
  return useContractRead<Escrow | Record<string, never>>("EscrowAdjudicator", "get_escrow", [escrowId], {});
}
export function useAllEscrows(offset = 0, limit = 100) {
  return useContractRead<Escrow[]>("EscrowAdjudicator", "get_all_escrows", [offset, limit], []);
}
export function useEscrowChallenges(escrowId: string, offset = 0, limit = 100) {
  return useContractRead<EscrowChallenge[]>("EscrowAdjudicator", "get_challenges", [escrowId, offset, limit], []);
}
export function useEscrowCount() {
  return useContractRead<number>("EscrowAdjudicator", "get_escrow_count", [], 0);
}

// ─── VaultManager ────────────────────────────────────────────────────────

export function useVault(vaultId: string) {
  return useContractRead<Vault | Record<string, never>>("VaultManager", "get_vault", [vaultId], {});
}
export function useAllVaults(offset = 0, limit = 100) {
  return useContractRead<Vault[]>("VaultManager", "get_all_vaults", [offset, limit], []);
}
export function useVaultCount() {
  return useContractRead<number>("VaultManager", "get_vault_count", [], 0);
}

// ─── PredictionMarket ────────────────────────────────────────────────────

export function useMarket(marketId: string) {
  return useContractRead<Market | Record<string, never>>("PredictionMarket", "get_market", [marketId], {});
}
export function useAllMarkets(offset = 0, limit = 100) {
  return useContractRead<Market[]>("PredictionMarket", "get_all_markets", [offset, limit], []);
}
export function useActiveMarkets(offset = 0, limit = 100) {
  return useContractRead<Market[]>("PredictionMarket", "get_active_markets", [offset, limit], []);
}
export function useMarketUserStake(marketId: string, address: string) {
  return useContractRead<MarketStake>("PredictionMarket", "get_user_stake", [marketId, address], {});
}
export function useMarketChallenges(marketId: string, offset = 0, limit = 100) {
  return useContractRead<MarketChallenge[]>("PredictionMarket", "get_challenges", [marketId, offset, limit], []);
}
export function useTotalVolume() {
  return useContractRead<number>("PredictionMarket", "get_total_volume", [], 0);
}
export function useMarketCount() {
  return useContractRead<number>("PredictionMarket", "get_market_count", [], 0);
}

// ─── CreditLine ──────────────────────────────────────────────────────────

export function useCreditLine(lineId: string) {
  return useContractRead<CreditLineData | Record<string, never>>("CreditLine", "get_line", [lineId], {});
}
export function useAllCreditLines(offset = 0, limit = 100) {
  return useContractRead<CreditLineData[]>("CreditLine", "get_all_lines", [offset, limit], []);
}
export function useCreditLineCount() {
  return useContractRead<number>("CreditLine", "get_line_count", [], 0);
}
