"use client";

import { useState } from "react";
import { SANS, MONO, SERIF, AppNav, PulseTicker, panel, monoLabel, ThinkingDots } from "@/components/compass/ui";
import { useAllProjects, useTotalAllocated, useContractWrite, ProjectData } from "@/hooks/useContract";

function projectToCard(p: ProjectData) {
  const statusMap: Record<string, { label: string; color: string; pulse: boolean }> = {
    funded: { label: "FUNDED", color: "#6fbf8f", pulse: false },
    partial: { label: "PARTIAL", color: "#7fd4d4", pulse: true },
    rejected: { label: "REJECTED", color: "#d6926a", pulse: false },
    completed: { label: "COMPLETED", color: "#6fbf8f", pulse: false },
  };
  const s = statusMap[p.status] || { label: p.status.toUpperCase(), color: "rgba(236,235,230,.5)", pulse: false };
  return {
    id: p.id, name: p.name, ask: p.funding_requested.toLocaleString(),
    allocated: p.funding_allocated, status: s.label, statusColor: s.color, pulse: s.pulse,
    pitch: p.expected_outcome, reasoning: p.ai_reasoning, conditions: p.conditions,
    applicant: p.applicant,
  };
}

export default function BuildersPage() {
  const { data: projects, loading, refetch } = useAllProjects();
  const { data: totalAllocated } = useTotalAllocated();
  const { execute, loading: writing, error: writeError } = useContractWrite();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState("");
  const [weeks, setWeeks] = useState("8");
  const [submitResult, setSubmitResult] = useState<string | null>(null);

  const PROPOSALS = projects.map(projectToCard);

  const submitProject = async () => {
    if (!name || !desc || !amount || !outcome) return;
    setSubmitResult(null);
    try {
      const result = await execute("BuilderFunding", "submit_project", [
        name, desc, parseInt(amount), outcome, parseInt(weeks),
      ]);
      setSubmitResult(`${result.result} recorded — TX ${result.txHash.slice(0, 10)}…`);
      setName(""); setDesc(""); setAmount(""); setOutcome("");
      refetch();
    } catch { /* handled by hook */ }
  };

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="BUILDER FUNDING" active="Builders" status={`● ${totalAllocated.toLocaleString()} ALLOCATED · ${projects.length} PROPOSALS`} />
      <PulseTicker />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>BUILDERS · MILESTONE-GATED</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>Capital that funds the ecosystem.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Proposals are argued, not rubber-stamped. Every tranche releases against a milestone — and every release is recorded onchain.
          </p>
        </div>

        {/* PROPOSALS */}
        {loading && (
          <div style={{ ...panel, padding: 32, textAlign: "center" }}>
            <span style={{ font: `400 13px ${MONO}`, color: "#7fd4d4" }}>READING ONCHAIN STATE…</span>
          </div>
        )}

        {!loading && PROPOSALS.length === 0 && !showForm && (
          <div style={{ ...panel, padding: 48, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <span style={{ font: `italic 400 18px/1.5 ${SERIF}`, color: "rgba(236,235,230,.55)" }}>
              No proposals submitted yet. Submit the first builder project.
            </span>
            <button className="ce-btn-primary" onClick={() => setShowForm(true)} style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7 }}>
              Submit a proposal
            </button>
          </div>
        )}

        {PROPOSALS.length > 0 && (
          <div className="ce-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {PROPOSALS.map((p) => (
              <div key={p.id} className="ce-card-hover" style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 10, padding: 22, background: "#0a0f1a", display: "flex", flexDirection: "column", gap: 12, animation: "ceRise .5s ease-out both" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: `400 9.5px ${MONO}`, color: "rgba(236,235,230,.45)" }}>{p.id}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, font: `500 9.5px ${MONO}`, color: p.statusColor, letterSpacing: ".1em" }}>
                    {p.pulse && <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7fd4d4", animation: "cePulse 1.6s infinite" }} />}
                    {p.status}
                  </span>
                </div>
                <span style={{ font: `500 16px ${SANS}` }}>{p.name}</span>
                <span style={{ font: `italic 400 13px/1.5 ${SERIF}`, color: "rgba(236,235,230,.6)" }}>&quot;{p.pitch}&quot;</span>
                <span style={{ font: `500 12px ${MONO}`, color: "rgba(236,235,230,.7)" }}>ASK {p.ask} · ALLOCATED {p.allocated.toLocaleString()}</span>
                {p.reasoning && (
                  <div style={{ borderTop: "1px solid rgba(236,235,230,.08)", paddingTop: 10, font: `400 11px/1.5 ${SANS}`, color: "rgba(236,235,230,.55)" }}>
                    {p.reasoning}
                  </div>
                )}
                {p.conditions && (
                  <div style={{ font: `400 10px ${MONO}`, color: "#d6926a" }}>CONDITIONS: {p.conditions}</div>
                )}
              </div>
            ))}

            {/* Submit card */}
            <div
              className="ce-card-hover"
              onClick={() => setShowForm(true)}
              style={{ border: "1px dashed rgba(127,212,212,.3)", borderRadius: 10, padding: 22, background: "rgba(127,212,212,.03)", display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: 200 }}
            >
              <span style={{ font: `italic 400 17px/1.45 ${SERIF}`, color: "#7fd4d4" }}>&quot;Submit a proposal.&quot;</span>
              <span style={{ font: `400 12px/1.6 ${SANS}`, color: "rgba(236,235,230,.5)", maxWidth: 220 }}>
                The council evaluates, allocates, and records the decision onchain.
              </span>
            </div>
          </div>
        )}

        {/* SUBMIT FORM */}
        {showForm && (
          <div style={{ ...panel, padding: 28, display: "flex", flexDirection: "column", gap: 16, animation: "ceRise .4s ease-out both" }}>
            <span style={{ ...monoLabel, letterSpacing: ".2em" }}>SUBMIT PROPOSAL — AI COUNCIL EVALUATES</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" style={inputStyle} />
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Funding requested (cGEN)" style={inputStyle} />
              <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Expected outcome" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} style={{ ...inputStyle, gridColumn: "1 / -1", resize: "vertical" }} />
              <input value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="Timeline (weeks)" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button className="ce-btn-primary" onClick={submitProject} disabled={writing || !name || !amount} style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, opacity: writing ? 0.5 : 1 }}>
                {writing ? "Council evaluating…" : "Submit to council"}
              </button>
              <button className="ce-btn-secondary" onClick={() => setShowForm(false)} style={{ font: `500 13px ${SANS}`, padding: "12px 20px", borderRadius: 7 }}>
                Cancel
              </button>
            </div>
            {writeError && <span style={{ font: `400 11px ${MONO}`, color: "#d6926a" }}>{writeError}</span>}
            {submitResult && <span style={{ font: `400 11px ${MONO}`, color: "#6fbf8f" }}>{submitResult}</span>}
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  font: `400 14px ${SANS}`, padding: "12px 16px", borderRadius: 8,
  border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)",
  color: "#ecebe6", outline: "none",
};
