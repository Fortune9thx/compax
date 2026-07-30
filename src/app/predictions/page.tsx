"use client";

import { useState } from "react";
import { AppShell } from "@/components/compax/AppShell";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useAllMarkets, useTotalVolume, useContractWrite, type MarketData } from "@/hooks/useContract";

export default function PredictionsPage() {
  const { data: markets, loading, error, refetch } = useAllMarkets();
  const { data: totalVolume } = useTotalVolume();
  const { execute, loading: writing } = useContractWrite();
  const { tx, run, reset } = useTxStatus();

  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [resDate, setResDate] = useState("");

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const selectedM = markets.find((m) => m.id === selected);
  const open = markets.filter((m) => m.status === "active");

  const createMarket = async () => {
    if (!question || !resDate) return;
    const r = await run(() => execute("PredictionMarkets", "create_market", [question, resDate]));
    if (r.ok) {
      setQuestion(""); setResDate(""); setShowCreate(false);
      refetch();
    }
  };

  const resolveMarket = async (id: string) => {
    await run(() => execute("PredictionMarkets", "resolve_market", [id]));
    refetch();
  };

  const pct = (m: MarketData) => {
    const total = m.total_yes + m.total_no;
    return total > 0 ? Math.round((m.total_yes / total) * 100) : 50;
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Predictions"
        meta={`${open.length} open · ${markets.length - open.length} resolved`}
      />

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(3, 1fr) auto", alignItems: "center", marginBottom: 28 }}>
        <StatTile label="Total volume" value={totalVolume.toLocaleString()} unit="cGEN" />
        <StatTile label="Open" value={open.length} />
        <StatTile label="Resolved" value={markets.length - open.length} />
        <button className="ce-btn" onClick={() => setShowCreate((s) => !s)} style={{ justifySelf: "end" }}>
          {showCreate ? "Close" : "New market"}
        </button>
      </div>

      {showCreate && (
        <Panel style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, animation: "ceRise .3s ease-out both" }}>
          <span className="ce-section-label">New market</span>
          <input className="ce-input" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="State the question to be resolved…" />
          <input className="ce-input" value={resDate} onChange={(e) => setResDate(e.target.value)} placeholder="Resolution date (e.g. 2026-09-01)" />
          <button className="ce-btn" onClick={createMarket} disabled={writing || !question || !resDate || tx.phase === "deliberating"} style={{ alignSelf: "flex-start" }}>
            {tx.phase === "deliberating" ? "Creating…" : "Create market"}
          </button>
          {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
        </Panel>
      )}

      <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1fr 1.2fr", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="ce-section-label">Markets</span>
          {loading && markets.length === 0 ? (
            <EmptyState>Loading…</EmptyState>
          ) : markets.length === 0 ? (
            <EmptyState>{degraded ? "Markets syncing…" : "No markets yet."}</EmptyState>
          ) : (
            markets.map((m: MarketData) => {
              const yes = pct(m);
              return (
                <Panel
                  key={m.id}
                  onClick={() => setSelected(m.id)}
                  style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, borderColor: selected === m.id ? "color-mix(in srgb, var(--primary) 45%, transparent)" : undefined }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ce-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>{m.id}</span>
                    <Tag tone={m.status === "active" ? "standard" : m.outcome === "yes" ? "active" : "provisional"}>
                      {m.status === "active" ? "OPEN" : `RESOLVED · ${(m.outcome || "").toUpperCase()}`}
                    </Tag>
                  </div>
                  <span className="ce-serif" style={{ fontSize: 15, fontStyle: "italic", color: "var(--text)", lineHeight: 1.45 }}>“{m.question}”</span>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--raised)" }}>
                    <div style={{ width: `${yes}%`, background: "var(--primary)" }} />
                    <div style={{ width: `${100 - yes}%`, background: "var(--clay)" }} />
                  </div>
                  <div className="ce-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5 }}>
                    <span style={{ color: "var(--primary)" }}>YES {yes}%</span>
                    <span style={{ color: "var(--clay)" }}>NO {100 - yes}%</span>
                  </div>
                  {m.status === "active" && (
                    <button
                      className="ce-btn ce-btn-ghost"
                      onClick={(e) => { e.stopPropagation(); resolveMarket(m.id); }}
                      disabled={writing || tx.phase === "deliberating"}
                      style={{ alignSelf: "flex-start", fontSize: 12, padding: "7px 14px" }}
                    >
                      {tx.phase === "deliberating" ? "Resolving…" : "Resolve"}
                    </button>
                  )}
                </Panel>
              );
            })
          )}
        </div>

        <Panel style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 20 }}>
          {!selectedM ? (
            <EmptyState>Select a market.</EmptyState>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="ce-section-label">Resolution · {selectedM.id}</span>
                <Tag tone={selectedM.status === "active" ? "standard" : "active"}>{selectedM.status === "active" ? "OPEN" : "RESOLVED"}</Tag>
              </div>
              <div className="ce-serif" style={{ fontSize: 18, fontStyle: "italic", lineHeight: 1.45, color: "var(--text)" }}>“{selectedM.question}”</div>
              {selectedM.resolution_reasoning ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span className="ce-section-label">Reasoning</span>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>{selectedM.resolution_reasoning}</p>
                </div>
              ) : (
                <EmptyState>Unresolved.</EmptyState>
              )}
              <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)" }}>DEADLINE: {selectedM.resolution_date || "—"}</span>
            </>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
