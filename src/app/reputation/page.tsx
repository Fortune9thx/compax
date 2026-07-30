"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/compax/AppShell";
import { EngineFingerprint } from "@/components/compax/Engine";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { useReputation, useRepHistory, useContractWrite, type RepEvent } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";

export default function ReputationPage() {
  const { address: walletAddress, connected } = useWallet();
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (connected && walletAddress) setAddress(walletAddress);
  }, [connected, walletAddress]);

  const { data: score, loading, error, refetch: refetchScore } = useReputation(address || "0x0");
  const { data: history, refetch: refetchHistory } = useRepHistory(address || "0x0");
  const { execute, loading: claiming } = useContractWrite();

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const rep = Math.round(score.total_score / 10);

  // Standing rendered in the same cardinal geometry as vault allocation.
  const standing = {
    lending: Math.max(0, score.loan_score),
    staking: Math.max(0, score.vault_score),
    builders: Math.max(0, score.funding_score),
    predictions: Math.max(0, score.prediction_score),
  };

  const claimFaucet = async () => {
    try {
      await execute("ReputationSystem", "claim_cgen", []);
      refetchScore();
      refetchHistory();
    } catch { /* handled */ }
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Reputation"
        meta={`${score.total_actions} actions on record`}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 28 }}>
        <input className="ce-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address (0x…)" />
        <button className="ce-btn" onClick={claimFaucet} disabled={claiming} style={{ whiteSpace: "nowrap" }}>
          {claiming ? "Claiming…" : "Claim cGEN faucet"}
        </button>
      </div>

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>
        <StatTile label="Reputation" value={rep} hint={rep >= 50 ? "good standing" : "under review"} />
        <StatTile label="Total actions" value={score.total_actions} />
        <StatTile label="Total score" value={score.total_score.toLocaleString()} />
        <StatTile label="Standing" value={<EngineFingerprint allocation={standing} width={56} height={20} title="Reputation standing" />} />
      </div>

      <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1fr 1.3fr", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Panel style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="ce-section-label">{loading ? "Reading onchain…" : "Sector scores"}</span>
            {[
              { k: "Lending", v: score.loan_score },
              { k: "Staking / vaults", v: score.vault_score },
              { k: "Builders", v: score.funding_score },
              { k: "Predictions", v: score.prediction_score },
            ].map((s) => (
              <div key={s.k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 120, fontSize: 12, color: "var(--muted)" }}>{s.k}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--raised)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.abs(s.v) / 5)}%`, height: "100%", background: s.v >= 0 ? "var(--primary)" : "var(--clay)", borderRadius: 4 }} />
                </div>
                <span className="ce-mono" style={{ width: 48, fontSize: 12, textAlign: "right", color: s.v >= 0 ? "var(--primary)" : "var(--clay)" }}>{s.v}</span>
              </div>
            ))}
          </Panel>

          <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="ce-section-label">Standing</span>
            <p style={{ fontSize: 14, color: "var(--text)", margin: 0 }}>
              {score.total_actions === 0
                ? "No actions recorded."
                : rep >= 70 ? "Reliable counterparty." : rep >= 40 ? "Emerging track record." : "Under observation."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag tone={rep >= 50 ? "active" : "provisional"}>Lending: {rep >= 50 ? "standard rate" : "elevated rate"}</Tag>
              <Tag tone={rep >= 40 ? "active" : "provisional"}>Builders: {rep >= 40 ? "clear" : "restricted"}</Tag>
            </div>
          </Panel>
        </div>

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--line-soft)" }}>
            <span className="ce-h2" style={{ fontSize: 16, margin: 0 }}>Reputation timeline</span>
            <span className="ce-section-label">Every layer is permanent</span>
          </div>
          {!address ? (
            <EmptyState>Connect a wallet or enter an address to view standing.</EmptyState>
          ) : history.length === 0 ? (
            <EmptyState>{degraded ? "Standing syncing…" : "No activity yet."}</EmptyState>
          ) : (
            history.map((e: RepEvent, i: number) => (
              <div key={i} className="ce-table-row" style={{ display: "grid", gridTemplateColumns: "70px 1fr 60px", gap: 12, padding: "14px 24px", borderBottom: "1px solid var(--line-soft)", alignItems: "baseline" }}>
                <span className="ce-mono" style={{ fontSize: 10.5, color: "var(--faint)" }}>R-{String(i + 1).padStart(3, "0")}</span>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{e.reason}</span>
                <span className="ce-mono" style={{ fontSize: 12, textAlign: "right", color: e.delta >= 0 ? "var(--primary)" : "var(--clay)" }}>
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </span>
              </div>
            ))
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
