"use client";

import { useState } from "react";
import { SANS, MONO, SERIF, AppNav, PulseTicker, panel, monoLabel, ThinkingDots } from "@/components/compass/ui";
import { useAllMarkets, useContractWrite, MarketData } from "@/hooks/useContract";

function marketToCard(m: MarketData) {
  const total = m.total_yes + m.total_no;
  const yes = total > 0 ? Math.round((m.total_yes / total) * 100) : 50;
  return {
    id: m.id, question: m.question, yes, no: 100 - yes,
    method: "COUNCIL CONSENSUS · GENLAYER VALIDATORS",
    pool: total.toLocaleString(),
    status: m.status === "active" ? "OPEN" : m.outcome === "yes" ? "RESOLVED · YES" : "RESOLVED · NO",
    statusColor: m.status === "active" ? "#7fd4d4" : m.outcome === "yes" ? "#6fbf8f" : "#d6926a",
    pulse: m.status === "active",
    deadline: m.resolution_date,
    reasoning: m.resolution_reasoning,
    outcome: m.outcome,
    raw: m,
  };
}

export default function PredictionsPage() {
  const { data: markets, loading, refetch } = useAllMarkets();
  const { execute, loading: writing, error: writeError } = useContractWrite();
  const [selected, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [resDate, setResDate] = useState("");
  const [createResult, setCreateResult] = useState<string | null>(null);

  const QUESTIONS = markets.map(marketToCard);
  const selectedQ = QUESTIONS.find((q) => q.id === selected);

  const createMarket = async () => {
    if (!question || !resDate) return;
    setCreateResult(null);
    try {
      const result = await execute("PredictionMarkets", "create_market", [question, resDate]);
      setCreateResult(`${result.result} created — TX ${result.txHash.slice(0, 10)}…`);
      setQuestion(""); setResDate("");
      setShowCreate(false);
      refetch();
    } catch { /* handled */ }
  };

  const resolveMarket = async (marketId: string) => {
    try {
      await execute("PredictionMarkets", "resolve_market", [marketId]);
      refetch();
    } catch { /* handled */ }
  };

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="PREDICTION MARKETS" active="Predictions" status={`● ${QUESTIONS.filter((q) => q.pulse).length} OPEN · ${QUESTIONS.filter((q) => !q.pulse).length} RESOLVED`} />
      <PulseTicker />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>PREDICTIONS · COUNCIL-RESOLVED</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>Questions intelligent contracts can resolve.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Markets priced by conviction, settled by reasoning. Every resolution is written to the record with the council&apos;s argument preserved onchain.
          </p>
        </div>

        <div className="ce-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 24, alignItems: "start" }}>
          {/* QUESTIONS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={monoLabel}>QUESTIONS ON THE RECORD</span>
              <button onClick={() => setShowCreate(true)} style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", background: "none", border: "1px solid rgba(127,212,212,.3)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
                + CREATE
              </button>
            </div>

            {loading && (
              <div style={{ ...panel, padding: 24, textAlign: "center" }}>
                <span style={{ font: `400 12px ${MONO}`, color: "#7fd4d4" }}>READING ONCHAIN STATE…</span>
              </div>
            )}

            {!loading && QUESTIONS.length === 0 && (
              <div style={{ ...panel, padding: 36, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
                <span style={{ font: `italic 400 16px/1.5 ${SERIF}`, color: "rgba(236,235,230,.45)" }}>
                  No markets created yet. Post the first question.
                </span>
                <button className="ce-btn-primary" onClick={() => setShowCreate(true)} style={{ font: `600 13px ${SANS}`, padding: "10px 20px", borderRadius: 7 }}>
                  Create a market
                </button>
              </div>
            )}

            {QUESTIONS.map((q) => (
              <div
                key={q.id}
                onClick={() => setSelected(q.id)}
                className="ce-card-hover"
                style={{
                  ...panel, padding: 20, cursor: "pointer",
                  display: "flex", flexDirection: "column", gap: 12,
                  borderColor: selected === q.id ? "rgba(127,212,212,.4)" : undefined,
                  animation: "ceRise .5s ease-out both",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: `400 9.5px ${MONO}`, color: "rgba(236,235,230,.45)" }}>{q.id}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, font: `500 9.5px ${MONO}`, color: q.statusColor, letterSpacing: ".1em" }}>
                    {q.pulse && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7fd4d4", animation: "cePulse 1.6s infinite" }} />}
                    {q.status}
                  </span>
                </div>
                <span style={{ font: `italic 400 15px/1.45 ${SERIF}` }}>&quot;{q.question}&quot;</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${q.yes}%`, background: "#6fbf8f", borderRadius: "3px 0 0 3px" }} />
                    <div style={{ width: `${q.no}%`, background: "#d6926a", borderRadius: "0 3px 3px 0" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", font: `500 9.5px ${MONO}` }}>
                    <span style={{ color: "#6fbf8f" }}>YES {q.yes}%</span>
                    <span style={{ color: "#d6926a" }}>NO {q.no}%</span>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
                  <span>{q.method}</span>
                  <span>POOL {q.pool}</span>
                </div>
                {q.pulse && (
                  <button
                    onClick={(e) => { e.stopPropagation(); resolveMarket(q.id); }}
                    disabled={writing}
                    style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", background: "rgba(127,212,212,.08)", border: "1px solid rgba(127,212,212,.3)", borderRadius: 6, padding: "6px 14px", cursor: "pointer", alignSelf: "flex-start" }}
                  >
                    {writing ? "RESOLVING…" : "RESOLVE"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* RESOLUTION PANEL */}
          <div style={{ ...panel, padding: 26, display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 100 }}>
            {!selectedQ ? (
              <div style={{ padding: "48px 20px", textAlign: "center" }}>
                <span style={{ font: `italic 400 16px/1.6 ${SERIF}`, color: "rgba(236,235,230,.4)" }}>
                  {QUESTIONS.length > 0 ? "Select a question to view its resolution." : "Create a market to get started."}
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", ...monoLabel }}>
                  <span>RESOLUTION · {selectedQ.id}</span>
                  <span style={{ color: selectedQ.statusColor }}>{selectedQ.status}</span>
                </div>
                <div style={{ font: `italic 400 18px/1.45 ${SERIF}` }}>&quot;{selectedQ.question}&quot;</div>

                {selectedQ.reasoning ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <span style={{ ...monoLabel, letterSpacing: ".2em" }}>COUNCIL REASONING — ONCHAIN</span>
                    <div style={{ font: `400 13px/1.6 ${SANS}`, color: "rgba(236,235,230,.75)", animation: "ceRise .4s ease-out both" }}>
                      {selectedQ.reasoning}
                    </div>
                  </div>
                ) : (
                  <div style={{ font: `400 13px/1.6 ${SANS}`, color: "rgba(236,235,230,.5)" }}>
                    Market is still active. Reasoning will appear after resolution.
                  </div>
                )}

                <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
                  DEADLINE: {selectedQ.deadline || "—"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CREATE MODAL */}
        {showCreate && (
          <div style={{ ...panel, padding: 28, display: "flex", flexDirection: "column", gap: 16, animation: "ceRise .4s ease-out both" }}>
            <span style={{ ...monoLabel, letterSpacing: ".2em" }}>CREATE PREDICTION MARKET</span>
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="State the question to be resolved…" style={inputStyle} />
            <input value={resDate} onChange={(e) => setResDate(e.target.value)} placeholder="Resolution date (e.g. 2026-09-01)" style={inputStyle} />
            <div style={{ display: "flex", gap: 12 }}>
              <button className="ce-btn-primary" onClick={createMarket} disabled={writing || !question || !resDate} style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, opacity: writing ? 0.5 : 1 }}>
                {writing ? "Creating on GenLayer…" : "Create market"}
              </button>
              <button className="ce-btn-secondary" onClick={() => setShowCreate(false)} style={{ font: `500 13px ${SANS}`, padding: "12px 20px", borderRadius: 7 }}>Cancel</button>
            </div>
            {writeError && <span style={{ font: `400 11px ${MONO}`, color: "#d6926a" }}>{writeError}</span>}
            {createResult && <span style={{ font: `400 11px ${MONO}`, color: "#6fbf8f" }}>{createResult}</span>}
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  font: `400 14px var(--font-sans), 'IBM Plex Sans', sans-serif`, padding: "12px 16px", borderRadius: 8,
  border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)",
  color: "#ecebe6", outline: "none",
};
