"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/compax/AppShell";
import { EngineFingerprint } from "@/components/compax/Engine";
import { PageHead, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { useAllVaults, type VaultData } from "@/hooks/useContract";

const STRATEGIES = ["All strategies", "conservative", "balanced", "growth"];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={`ce-chip${active ? " ce-chip-active" : ""}`} onClick={onClick}>
      {label === "All strategies" ? label : label[0].toUpperCase() + label.slice(1)}
    </button>
  );
}

export default function VaultMarketplacePage() {
  const { data: vaults, loading, error } = useAllVaults();
  const [strat, setStrat] = useState("All strategies");
  const degraded = !!error && /not found|timeout|unreachable/i.test(error);

  const filtered = vaults.filter((v) => strat === "All strategies" || v.strategy === strat);

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Vaults"
        meta={`${vaults.length} operating`}
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {STRATEGIES.map((s) => (
          <Chip key={s} label={s} active={strat === s} onClick={() => setStrat(s)} />
        ))}
        <Link href="/vaults/create" className="ce-btn" style={{ marginLeft: "auto", textDecoration: "none" }}>
          Create a vault
        </Link>
      </div>

      <Panel style={{ padding: 0, overflow: "hidden" }}>
        <div className="ce-vaults-head">
          <span>Vault</span>
          <span>Fingerprint</span>
          <span style={{ textAlign: "right" }}>Treasury</span>
          <span style={{ textAlign: "right" }}>Yield</span>
          <span style={{ textAlign: "right" }}>Deposits</span>
          <span>Last consensus</span>
        </div>

        {loading && vaults.length === 0 ? (
          <EmptyState>Loading…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            {vaults.length === 0 ? "No vaults yet." : "No vaults match that strategy."}
          </EmptyState>
        ) : (
          filtered.map((v: VaultData) => (
            <Link key={v.id} href={`/vaults/${v.id}`} className="ce-vaults-row">
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{v.name}</span>
                  <Tag>{v.strategy}</Tag>
                </div>
                <p className="ce-serif" style={{ fontSize: 12.5, fontStyle: "italic", color: "var(--muted)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  “{v.objective}”
                </p>
              </div>
              <EngineFingerprint
                allocation={{
                  staking: v.allocation_staking,
                  lending: v.allocation_lending,
                  builders: v.allocation_builders,
                  predictions: v.allocation_predictions,
                }}
                title={`${v.name} allocation`}
              />
              <span className="ce-mono ce-num">{v.treasury.toLocaleString()}</span>
              <span className="ce-mono ce-num" style={{ color: v.total_yield > 0 ? "var(--primary)" : "var(--faint)" }}>
                {v.total_yield > 0 ? `+${v.total_yield.toLocaleString()}` : "—"}
              </span>
              <span className="ce-mono ce-num" style={{ color: "var(--muted)" }}>{v.deposit_count}</span>
              <span className="ce-mono" style={{ fontSize: 10.5, color: "var(--faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {v.last_rebalance_reason ? v.last_rebalance_reason.slice(0, 44) : "Awaiting first rebalance"}
              </span>
            </Link>
          ))
        )}
      </Panel>
    </AppShell>
  );
}
