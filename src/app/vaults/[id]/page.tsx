"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/compax/AppShell";
import { ConsensusGlyph } from "@/components/compax/Engine";
import { AllocationPanel } from "@/components/compax/Allocation";
import { DecisionRecord } from "@/components/compax/DecisionRecord";
import { StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import {
  useVault,
  useRebalanceHistory,
  useContractWrite,
  useActiveEvent,
  type RebalanceRecord,
} from "@/hooks/useContract";

type Layer = "brain" | "treasury" | "history";

export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params?.id as string;
  const { data: vault, loading, error, refetch } = useVault(vaultId);
  const { data: history, refetch: refetchHistory } = useRebalanceHistory(vaultId);
  const { data: activeEvent } = useActiveEvent();
  const { execute, loading: writing, error: writeError } = useContractWrite();
  const { tx, run, reset } = useTxStatus();
  const [layer, setLayer] = useState<Layer>("brain");
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);

  const doDeposit = async () => {
    if (!depositAmt) return;
    try {
      await execute("VaultManager", "deposit", [vaultId], BigInt(depositAmt));
      setDepositAmt("");
      refetch();
    } catch { /* handled */ }
  };

  const doWithdraw = async () => {
    if (!withdrawAmt) return;
    try {
      await execute("VaultManager", "withdraw", [vaultId, parseInt(withdrawAmt)]);
      setWithdrawAmt("");
      refetch();
    } catch { /* handled */ }
  };

  const doRebalance = async () => {
    const ctx = activeEvent
      ? `${activeEvent.name}: ${activeEvent.description} (severity ${activeEvent.severity})`
      : "";
    await run(() => execute("VaultManager", "rebalance_vault", [vaultId, ctx]));
    refetch();
    refetchHistory();
  };

  if (loading && !vault) {
    return (
      <AppShell degraded={degraded}>
        <div className="ce-mono" style={{ color: "var(--signal)", padding: "60px 0", fontSize: 13 }}>
          Loading…
        </div>
      </AppShell>
    );
  }

  if (!vault) {
    return (
      <AppShell degraded={degraded}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", paddingTop: 40 }}>
          <span style={{ fontSize: 16, color: "var(--muted)" }}>
            {degraded ? "Vault state unavailable." : "Vault not found."}
          </span>
          <Link href="/vaults" className="ce-btn">Back to vaults</Link>
        </div>
      </AppShell>
    );
  }

  const alloc = {
    staking: vault.allocation_staking,
    lending: vault.allocation_lending,
    builders: vault.allocation_builders,
    predictions: vault.allocation_predictions,
  };
  const decided = !!vault.last_rebalance_reason;
  const votes: [boolean, boolean, boolean, boolean, boolean] = [true, true, true, true, true];

  const tab = (id: Layer, label: string) => (
    <button className={`ce-tab${layer === id ? " ce-tab-active" : ""}`} onClick={() => setLayer(id)}>
      {label}
    </button>
  );

  return (
    <AppShell degraded={degraded}>
      {/* breadcrumb */}
      <div className="ce-mono" style={{ fontSize: 11, color: "var(--faint)", marginBottom: 18 }}>
        <Link href="/vaults" style={{ color: "var(--muted)" }}>Vaults</Link> / {vault.name}
      </div>

      {/* header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap", marginBottom: 28 }}>
        <div style={{ maxWidth: 560 }}>
          <h1 className="ce-h1" style={{ marginBottom: 10 }}>{vault.name}</h1>
          <p className="ce-serif" style={{ fontSize: 19, lineHeight: 1.4, fontStyle: "italic", color: "var(--muted)", margin: 0 }}>
            “{vault.objective}”
          </p>
        </div>
        <button className="ce-btn" onClick={doRebalance} disabled={writing || tx.phase === "deliberating"}>
          {tx.phase === "deliberating" ? "Rebalancing…" : "Rebalance"}
        </button>
      </header>

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <StatTile label="Treasury" value={vault.treasury.toLocaleString()} unit="cGEN" />
        <StatTile label="Strategy" value={<span style={{ fontSize: 18, textTransform: "capitalize" }}>{vault.strategy}</span>} />
        <StatTile label="Risk" value={`${vault.risk_tolerance}/10`} hint={vault.risk_tolerance > 6 ? "elevated" : "conservative"} />
        <StatTile label="Deposits" value={vault.deposit_count} />
      </div>

      {tx.phase !== "idle" && (
        <div style={{ marginBottom: 20 }}>
          <TxStatus tx={tx} onDismiss={reset} />
        </div>
      )}
      {writeError && tx.phase === "idle" && (
        <div className="ce-degraded-banner" style={{ color: "var(--clay)", borderColor: "color-mix(in srgb, var(--clay) 25%, transparent)", background: "color-mix(in srgb, var(--clay) 8%, transparent)" }}>
          {writeError}
        </div>
      )}

      {/* layer switch */}
      <div className="ce-tabs">
        {tab("brain", "Brain")}
        {tab("treasury", "Treasury")}
        {tab("history", "History")}
      </div>

      {/* BRAIN */}
      {layer === "brain" && (
        <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1.5fr 1fr", alignItems: "start", animation: "ceRise .35s ease-out both" }}>
          <Panel style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="ce-section-label">Last decision</span>
              <ConsensusGlyph votes={decided ? votes : [null, null, null, null, null]} size={6} />
            </div>

            {decided ? (
              <div style={{ border: "1px solid color-mix(in srgb, var(--primary) 35%, transparent)", borderRadius: 8, padding: 16, background: "color-mix(in srgb, var(--primary) 6%, transparent)" }}>
                <div className="ce-mono" style={{ fontSize: 9.5, color: "var(--primary)", letterSpacing: ".15em" }}>REASONING</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, color: "var(--text)" }}>{vault.last_rebalance_reason}</div>
              </div>
            ) : (
              <EmptyState>No decisions yet.</EmptyState>
            )}

            {activeEvent && (
              <div style={{ border: "1px solid color-mix(in srgb, var(--amber) 30%, transparent)", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--amber)" }}>{activeEvent.name}</span>
                  <Tag tone="provisional">severity {activeEvent.severity}/10</Tag>
                </div>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--muted)", margin: "8px 0 0" }}>{activeEvent.description}</p>
              </div>
            )}
          </Panel>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AllocationPanel
              label="Current allocation"
              allocation={alloc}
              normalize
              headline={vault.treasury.toLocaleString()}
              unit="cGEN treasury"
              votes={decided ? votes : [null, null, null, null, null]}
              degraded={degraded}
            />
            <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="ce-section-label">Deposit · fund this vault</span>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="ce-input" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Amount (wei)" />
                <button className="ce-btn" onClick={doDeposit} disabled={writing || !depositAmt}>{writing ? "…" : "Deposit"}</button>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input className="ce-input" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} placeholder="Withdraw amount" />
                <button className="ce-btn ce-btn-ghost" onClick={doWithdraw} disabled={writing || !withdrawAmt}>Withdraw</button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* TREASURY */}
      {layer === "treasury" && (
        <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start", animation: "ceRise .35s ease-out both" }}>
          <AllocationPanel
            label="Allocation breakdown"
            allocation={alloc}
            normalize
            headline={vault.treasury.toLocaleString()}
            unit="cGEN treasury"
            votes={decided ? votes : [null, null, null, null, null]}
            degraded={degraded}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Panel style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span className="ce-section-label">Vault metadata</span>
              {[
                { k: "Owner", v: vault.owner },
                { k: "Strategy", v: vault.strategy },
                { k: "Personality", v: vault.personality },
                { k: "ID", v: vault.id },
              ].map((m) => (
                <div key={m.k} className="ce-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, borderBottom: "1px solid var(--line-soft)", paddingBottom: 8 }}>
                  <span style={{ color: "var(--faint)" }}>{m.k}</span>
                  <span style={{ color: "var(--muted)", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.v}</span>
                </div>
              ))}
            </Panel>
          </div>
        </div>
      )}

      {/* HISTORY */}
      {layer === "history" && (
        <Panel style={{ padding: 0, overflow: "hidden", animation: "ceRise .35s ease-out both" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--line-soft)" }}>
            <span className="ce-h2" style={{ fontSize: 16, margin: 0 }}>Decisions</span>
            <span className="ce-section-label">{history.length} onchain</span>
          </div>
          {history.length === 0 ? (
            <EmptyState>No decisions yet.</EmptyState>
          ) : (
            history.map((r: RebalanceRecord, i: number) => (
              <DecisionRecord key={i} record={r} index={i} />
            ))
          )}
        </Panel>
      )}
    </AppShell>
  );
}
