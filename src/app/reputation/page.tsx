"use client";

import { useState } from "react";
import { SANS, MONO, SERIF, AppNav, PulseTicker, panel, monoLabel } from "@/components/compass/ui";
import { useReputation, useRepHistory, useContractWrite, RepEvent } from "@/hooks/useContract";

const DEMO_ADDRESS = "0x00f42f7ad0edbd0818bd46c8e51cdb5670dde6d9";

function eventToRow(e: RepEvent, i: number) {
  return {
    no: `R-${String(i + 1).padStart(3, "0")}`,
    event: `${e.reason}`,
    date: e.timestamp || "—",
    delta: e.delta > 0 ? `+${e.delta}` : String(e.delta),
    color: e.delta >= 0 ? "#6fbf8f" : "#d6926a",
  };
}

function scoreToStrata(score: { loan_score: number; funding_score: number; prediction_score: number; vault_score: number }) {
  const entries = [
    { label: "LENDING", h: Math.max(8, Math.abs(score.loan_score) / 5), color: score.loan_score >= 0 ? "rgba(111,191,143,.45)" : "rgba(214,146,106,.4)" },
    { label: "BUILDERS", h: Math.max(8, Math.abs(score.funding_score) / 5), color: score.funding_score >= 0 ? "rgba(111,191,143,.35)" : "rgba(214,146,106,.35)" },
    { label: "PREDICTIONS", h: Math.max(8, Math.abs(score.prediction_score) / 5), color: score.prediction_score >= 0 ? "rgba(127,212,212,.4)" : "rgba(214,146,106,.3)" },
    { label: "VAULTS", h: Math.max(8, Math.abs(score.vault_score) / 5), color: score.vault_score >= 0 ? "rgba(127,212,212,.5)" : "rgba(214,146,106,.25)" },
    { label: "GENESIS", h: 14, color: "rgba(127,212,212,.25)" },
  ];
  return entries;
}

export default function ReputationPage() {
  const [address, setAddress] = useState(DEMO_ADDRESS);
  const { data: score, loading, refetch: refetchScore } = useReputation(address);
  const { data: history, refetch: refetchHistory } = useRepHistory(address);
  const { execute, loading: claiming } = useContractWrite();

  const rep = Math.round(score.total_score / 10);
  const timeline = history.map(eventToRow);
  const strata = scoreToStrata(score);

  const claimFaucet = async () => {
    try {
      await execute("ReputationSystem", "claim_cgen", []);
      refetchScore();
      refetchHistory();
    } catch { /* handled */ }
  };

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="REPUTATION" active="Reputation" status={`● REP ${rep} · ${rep >= 50 ? "GOOD STANDING" : "UNDER REVIEW"}`} />
      <PulseTicker />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>REPUTATION · STRATA</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>How the system reads you.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Reputation is sediment, not a score. Every action deposits a layer — visible, permanent, readable by every council.
          </p>
        </div>

        {/* ADDRESS INPUT */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address (0x…)"
            style={{ flex: 1, font: `400 13px ${MONO}`, padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)", color: "#ecebe6", outline: "none" }}
          />
          <button className="ce-btn-primary" onClick={claimFaucet} disabled={claiming} style={{ font: `600 13px ${SANS}`, padding: "12px 20px", borderRadius: 7, whiteSpace: "nowrap", opacity: claiming ? 0.5 : 1 }}>
            {claiming ? "Claiming…" : "Claim cGEN faucet"}
          </button>
        </div>

        <div className="ce-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, alignItems: "start" }}>
          {/* SCORE + STRATA */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ ...panel, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={monoLabel}>{loading ? "READING ONCHAIN…" : "YOUR STRATA BAND"}</span>
                <span style={{ font: `600 28px ${SANS}`, color: "#7fd4d4" }}>{rep}</span>
              </div>

              <svg width="100%" height={160} viewBox="0 0 400 160" preserveAspectRatio="none" style={{ borderRadius: 8, overflow: "hidden" }}>
                {(() => {
                  let y = 160;
                  const totalH = strata.reduce((a, b) => a + b.h, 0);
                  return strata.map((s, i) => {
                    const h = (s.h / totalH) * 160;
                    y -= h;
                    return (
                      <g key={i}>
                        <rect x="0" y={y} width="400" height={h} fill={s.color} />
                        <text x="12" y={y + h / 2 + 3.5} fill="rgba(236,235,230,.6)" fontSize="8" fontFamily="IBM Plex Mono, monospace">{s.label}</text>
                      </g>
                    );
                  });
                })()}
              </svg>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, font: `400 10px ${MONO}` }}>
                <span style={{ color: "rgba(236,235,230,.45)" }}>LOAN: {score.loan_score}</span>
                <span style={{ color: "rgba(236,235,230,.45)" }}>FUNDING: {score.funding_score}</span>
                <span style={{ color: "rgba(236,235,230,.45)" }}>PREDICTION: {score.prediction_score}</span>
                <span style={{ color: "rgba(236,235,230,.45)" }}>VAULT: {score.vault_score}</span>
              </div>
            </div>

            {/* READING */}
            <div style={{ ...panel, padding: 26, display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ ...monoLabel, letterSpacing: ".2em" }}>SYSTEM READING</span>
              <div style={{ font: `italic 400 15px/1.55 ${SERIF}`, color: "rgba(236,235,230,.75)" }}>
                {score.total_actions === 0
                  ? `"No actions recorded yet. Claim the faucet to initialize your reputation strata."`
                  : `"${rep >= 70 ? "Reliable counterparty." : rep >= 40 ? "Emerging track record." : "Under observation."} ${score.total_actions} actions on record across ${[score.loan_score && "lending", score.funding_score && "builders", score.prediction_score && "predictions", score.vault_score && "vaults"].filter(Boolean).join(", ") || "no categories"}."`}
              </div>
              <div style={{ display: "flex", gap: 16, font: `500 10px ${MONO}` }}>
                <span style={{ color: rep >= 50 ? "#6fbf8f" : "#d6926a" }}>LENDING: {rep >= 50 ? "STANDARD RATE" : "ELEVATED RATE"}</span>
                <span style={{ color: rep >= 40 ? "#6fbf8f" : "#d6926a" }}>BUILDERS: {rep >= 40 ? "CLEAR" : "RESTRICTED"}</span>
                <span style={{ color: "#7fd4d4" }}>ACTIONS: {score.total_actions}</span>
              </div>
            </div>
          </div>

          {/* TIMELINE */}
          <div style={{ ...panel, overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(236,235,230,.08)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ font: `500 15px ${SANS}` }}>Reputation timeline</span>
              <span style={monoLabel}>EVERY LAYER IS PERMANENT</span>
            </div>
            {timeline.length === 0 && (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.4)" }}>
                  No reputation events yet. Interact with the system to build your strata.
                </span>
              </div>
            )}
            {timeline.map((r) => (
              <div key={r.no} className="ce-row-hover" style={{ display: "grid", gridTemplateColumns: "60px 1fr 80px 60px", gap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(236,235,230,.06)", font: `400 11px ${MONO}`, alignItems: "baseline" }}>
                <span style={{ color: "rgba(236,235,230,.45)" }}>{r.no}</span>
                <span style={{ font: `400 13px ${SANS}`, color: "rgba(236,235,230,.85)" }}>{r.event}</span>
                <span style={{ color: "rgba(236,235,230,.45)" }}>{r.date}</span>
                <span style={{ textAlign: "right", color: r.color, font: `500 12px ${MONO}` }}>{r.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
