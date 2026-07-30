"use client";

import Link from "next/link";
import { AppShell } from "@/components/compax/AppShell";
import { AllocationPanel } from "@/components/compax/Allocation";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import {
  useTotalTVL,
  useVaultCount,
  useCycleCount,
  useEventCount,
  useTotalVolume,
  useTotalBorrowed,
  useTotalAllocated,
  useTotalStaked,
  useAllVaults,
  useAllEvents,
  useAllMarkets,
  type VaultData,
  type EventData,
} from "@/hooks/useContract";

export default function EcosystemPage() {
  const { data: tvl } = useTotalTVL();
  const { data: vaultCount } = useVaultCount();
  const { data: cycleCount } = useCycleCount();
  const { data: eventCount } = useEventCount();
  const { data: totalVolume } = useTotalVolume();
  const { data: totalBorrowed } = useTotalBorrowed();
  const { data: totalAllocated } = useTotalAllocated();
  const { data: totalStaked } = useTotalStaked();
  const { data: vaults, error } = useAllVaults();
  const { data: events } = useAllEvents();
  const { data: markets } = useAllMarkets();

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const activeEvents = events.filter((e) => e.is_active);
  const maxSeverity = activeEvents.reduce((m, e) => Math.max(m, e.severity), 0);

  // Treasury-weighted aggregate allocation across all vaults → hero Engine.
  const agg = vaults.reduce(
    (acc, v) => {
      const w = v.treasury || 1;
      acc.staking += v.allocation_staking * w;
      acc.lending += v.allocation_lending * w;
      acc.builders += v.allocation_builders * w;
      acc.predictions += v.allocation_predictions * w;
      acc.yield += v.total_yield;
      return acc;
    },
    { staking: 0, lending: 0, builders: 0, predictions: 0, yield: 0 },
  );
  const alloc = vaults.length
    ? { staking: agg.staking, lending: agg.lending, builders: agg.builders, predictions: agg.predictions }
    : { staking: 1, lending: 1, builders: 1, predictions: 1 };


  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Overview"
        meta={`${vaultCount} vaults · ${activeEvents.length} active events`}
        actions={
          activeEvents.length > 0
            ? activeEvents.slice(0, 2).map((e) => (
                <Tag key={e.id} tone="provisional">{e.name} · sev {e.severity}</Tag>
              ))
            : undefined
        }
      />

      <div style={{ marginBottom: 16 }}>
        <AllocationPanel
          label="Network allocation"
          allocation={alloc}
          normalize
          headline={tvl.toLocaleString()}
          unit="cGEN total value locked"
          degraded={degraded}
        />
      </div>

      {/* global metrics */}
      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <StatTile label="Total value locked" value={tvl.toLocaleString()} unit="cGEN" />
        <StatTile label="Active vaults" value={vaultCount} />
        <StatTile label="Deployed · lending" value={totalBorrowed.toLocaleString()} unit="cGEN" />
        <StatTile label="Staked · reserve" value={totalStaked.toLocaleString()} unit="cGEN" />
      </div>
      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 40 }}>
        <StatTile label="Funded · builders" value={totalAllocated.toLocaleString()} unit="cGEN" />
        <StatTile label="Prediction volume" value={totalVolume.toLocaleString()} unit="cGEN" />
        <StatTile label="Economic events" value={eventCount} />
        <StatTile
          label="Allocation decisions"
          value={cycleCount}
          hint={cycleCount > 0 ? "reasoned onchain" : undefined}
        />
      </div>

      {/* rails */}
      <div className="ce-grid ce-3col" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
        <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ce-section-label">Vaults · {vaults.length} operating</span>
          {vaults.length === 0 ? (
            <EmptyState>{degraded ? "Vault state syncing…" : "No vaults yet."}</EmptyState>
          ) : (
            vaults.map((v: VaultData) => (
              <Link key={v.id} href={`/vaults/${v.id}`} className="ce-vault-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{v.name}</span>
                  <Tag>{v.strategy}</Tag>
                </div>
                <p className="ce-serif" style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.4 }}>
                  “{v.objective.slice(0, 80)}{v.objective.length > 80 ? "…" : ""}”
                </p>
                <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)", marginTop: 6, display: "block" }}>
                  {v.treasury.toLocaleString()} cGEN
                </span>
              </Link>
            ))
          )}
        </Panel>

        <Panel style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="ce-section-label" style={{ marginBottom: 10 }}>Prediction markets · {markets.length}</span>
          {markets.length === 0 ? (
            <EmptyState>No markets yet.</EmptyState>
          ) : (
            markets.slice(0, 6).map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
                <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)", flex: "none" }}>{m.id}</span>
                <span style={{ flex: 1, fontSize: 12.5, color: "var(--text)" }}>{m.question.slice(0, 48)}{m.question.length > 48 ? "…" : ""}</span>
                <span className="ce-mono" style={{ fontSize: 10, color: m.status === "active" ? "var(--signal)" : "var(--primary)" }}>{m.status === "active" ? "OPEN" : (m.outcome || "").toUpperCase()}</span>
              </div>
            ))
          )}
          <Link href="/predictions" className="ce-mono" style={{ fontSize: 12, marginTop: 12, color: "var(--signal)" }}>All markets →</Link>
        </Panel>

        <Panel style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="ce-section-label">Events · {events.length} recorded</span>
          {events.length === 0 ? (
            <EmptyState>No events yet.</EmptyState>
          ) : (
            events.slice(-6).reverse().map((e: EventData) => (
              <div key={e.id} style={{ display: "flex", gap: 10, borderBottom: "1px solid var(--line-soft)", paddingBottom: 11 }}>
                <span style={{ flex: "none", width: 7, height: 7, borderRadius: "50%", background: e.is_active ? "var(--amber)" : "var(--primary)", marginTop: 5 }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text)" }}>{e.name}</div>
                  <div className="ce-mono" style={{ fontSize: 9.5, color: "var(--faint)", marginTop: 2 }}>SEV {e.severity}/10 · {e.is_active ? "ACTIVE" : "RESOLVED"}</div>
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
