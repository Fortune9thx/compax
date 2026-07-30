"use client";

import { useState } from "react";
import { AppShell } from "@/components/compax/AppShell";
import { AllocationPanel } from "@/components/compax/Allocation";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import {
  useAllStakes,
  usePoolStats,
  useStakingApr,
  useContractWrite,
  type StakePosition,
} from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";

function shortAddr(a: string) {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default function StakingPage() {
  const { data: positions, loading, error, refetch } = useAllStakes();
  const { data: pool } = usePoolStats();
  const { data: apr } = useStakingApr();
  const { execute, loading: writing } = useContractWrite();
  const { tx, run, reset } = useTxStatus();
  const { address } = useWallet();

  const [amount, setAmount] = useState("");
  const [lockHint, setLockHint] = useState("");
  const [unstakingId, setUnstakingId] = useState<string | null>(null);
  const [unstakeError, setUnstakeError] = useState<string | null>(null);

  const doUnstake = async (positionId: string) => {
    setUnstakingId(positionId);
    setUnstakeError(null);
    try {
      await execute("StakingReserve", "unstake", [positionId]);
      refetch();
    } catch (e) {
      setUnstakeError(e instanceof Error ? e.message : String(e));
    } finally {
      setUnstakingId(null);
    }
  };

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const canStake = !!amount && Number(amount) > 0 && !writing && tx.phase !== "deliberating";

  const stake = async () => {
    if (!canStake) return;
    const r = await run(() =>
      execute(
        "StakingReserve",
        "stake",
        [lockHint.trim() || "flexible"],
        BigInt(amount),
      ),
    );
    if (r.ok) { setAmount(""); setLockHint(""); }
    refetch();
  };

  // Aggregate active positions into an allocation shape for the Engine.
  // Staking is one sector here, so the panel Engine shows tier composition.
  const active = positions.filter((p) => p.status === "active");
  const byTier = (t: string) =>
    active.filter((p) => p.tier === t).reduce((s, p) => s + p.amount, 0);
  const alloc = {
    staking: byTier("core") || 1,
    lending: byTier("standard"),
    builders: byTier("provisional"),
    predictions: Math.max(0, pool.total_staked - active.reduce((s, p) => s + p.amount, 0)),
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Staking"
        meta={`${(apr / 100).toFixed(2)}% pool APR`}
      />

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>
        <StatTile label="Pool APR" value={(apr / 100).toFixed(2)} unit="%" hint="AI-set, market-derived" />
        <StatTile label="Total staked" value={pool.total_staked.toLocaleString()} unit="cGEN" />
        <StatTile label="Active positions" value={pool.active_positions} />
        <StatTile label="Unique stakers" value={pool.unique_stakers} />
      </div>

      <div className="ce-grid ce-stake-grid" style={{ gridTemplateColumns: "1fr 1.2fr", alignItems: "start", marginBottom: 28 }}>
        <Panel style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="ce-section-label">Open a position</span>
          <input className="ce-input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (cGEN)" />
          <input className="ce-input" value={lockHint} onChange={(e) => setLockHint(e.target.value)} placeholder="Lock preference — e.g. flexible, 90-day lock, long-horizon" maxLength={50} />
          <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)" }}>
            The council weighs this alongside live conditions to set your yield band and tier — it's a preference, not a binding term.
          </span>
          <button className="ce-btn" onClick={stake} disabled={!canStake} style={{ alignSelf: "flex-start" }}>
            {tx.phase === "deliberating" ? "Staking…" : "Stake"}
          </button>
          {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
        </Panel>

        <AllocationPanel
          label="Reserve composition"
          allocation={alloc}
          labels={{ staking: "Core tier", lending: "Standard", builders: "Provisional", predictions: "Unassigned" }}
          headline={pool.total_staked.toLocaleString()}
          unit="cGEN staked"
          degraded={degraded}
        />
      </div>

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--line-soft)" }}>
          <span className="ce-h2" style={{ fontSize: 16, margin: 0 }}>Open positions</span>
          <span className="ce-section-label">{loading ? "Reading onchain…" : `${active.length} active`}</span>
        </div>
        {unstakeError && (
          <div className="ce-mono" style={{ padding: "10px 24px", fontSize: 11, color: "var(--clay)", borderBottom: "1px solid var(--line-soft)" }}>
            {unstakeError}
          </div>
        )}
        {active.length === 0 ? (
          <EmptyState>
            {degraded
              ? "Reserve state is syncing — positions will appear once the node resolves reads."
              : "No positions yet. Open the first one above."}
          </EmptyState>
        ) : (
          active.map((p: StakePosition) => {
            const isMine = !!address && p.staker.toLowerCase() === address.toLowerCase();
            return (
              <div
                key={p.id}
                className="ce-table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 120px 100px 90px 90px",
                  gap: 12,
                  padding: "13px 24px",
                  borderBottom: "1px solid var(--line-soft)",
                  alignItems: "center",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--faint)" }}>{p.id}</span>
                <span style={{ color: "var(--muted)" }}>{shortAddr(p.staker)}</span>
                <span style={{ color: "var(--text)" }}>{p.amount.toLocaleString()} cGEN</span>
                <span style={{ color: "var(--primary)" }}>{(p.apr_bps / 100).toFixed(2)}%</span>
                <Tag tone={p.tier}>{p.tier}</Tag>
                {isMine ? (
                  <button
                    className="ce-btn ce-btn-ghost"
                    style={{ fontSize: 11, padding: "5px 10px", justifySelf: "end" }}
                    onClick={() => doUnstake(p.id)}
                    disabled={unstakingId === p.id}
                  >
                    {unstakingId === p.id ? "…" : "Unstake"}
                  </button>
                ) : <span />}
              </div>
            );
          })
        )}
      </Panel>
    </AppShell>
  );
}
