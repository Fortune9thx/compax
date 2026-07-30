"use client";

import { useState } from "react";
import { AppShell } from "@/components/compax/AppShell";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useAllProjects, useTotalAllocated, useContractWrite, type ProjectData } from "@/hooks/useContract";

function statusTone(s: string) {
  return s === "funded" || s === "completed" ? "active" : s === "partial" ? "standard" : "provisional";
}

export default function BuildersPage() {
  const { data: projects, loading, error, refetch } = useAllProjects();
  const { data: totalAllocated } = useTotalAllocated();
  const { execute, loading: writing } = useContractWrite();
  const { tx, run, reset } = useTxStatus();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [outcome, setOutcome] = useState("");
  const [weeks, setWeeks] = useState("8");

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);

  const submitProject = async () => {
    if (!name || !desc || !amount || !outcome) return;
    const r = await run(() =>
      execute("BuilderFunding", "submit_project", [name, desc, parseInt(amount), outcome, parseInt(weeks)]),
    );
    if (r.ok) {
      setName(""); setDesc(""); setAmount(""); setOutcome("");
      setShowForm(false);
      refetch();
    }
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Builders"
        meta={`${projects.length} proposals`}
      />

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(3, 1fr) auto", alignItems: "center", marginBottom: 28 }}>
        <StatTile label="Total allocated" value={totalAllocated.toLocaleString()} unit="cGEN" />
        <StatTile label="Proposals" value={projects.length} />
        <StatTile label="Funded" value={projects.filter((p) => p.status === "funded" || p.status === "partial" || p.status === "completed").length} />
        <button className="ce-btn" onClick={() => setShowForm((s) => !s)} style={{ justifySelf: "end" }}>
          {showForm ? "Close" : "New proposal"}
        </button>
      </div>

      {showForm && (
        <Panel style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28, animation: "ceRise .3s ease-out both" }}>
          <span className="ce-section-label">New proposal</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input className="ce-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
            <input className="ce-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Funding requested (cGEN)" />
            <input className="ce-input" style={{ gridColumn: "1 / -1" }} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Expected outcome" />
            <textarea className="ce-input" style={{ gridColumn: "1 / -1", resize: "vertical" }} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
            <input className="ce-input" value={weeks} onChange={(e) => setWeeks(e.target.value)} placeholder="Timeline (weeks)" />
          </div>
          <button className="ce-btn" onClick={submitProject} disabled={writing || !name || !amount || tx.phase === "deliberating"} style={{ alignSelf: "flex-start" }}>
            {tx.phase === "deliberating" ? "Submitting…" : "Submit"}
          </button>
          {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
        </Panel>
      )}

      {loading && projects.length === 0 ? (
        <EmptyState>Loading…</EmptyState>
      ) : projects.length === 0 ? (
        <EmptyState>{degraded ? "Proposals syncing…" : "No proposals yet."}</EmptyState>
      ) : (
        <div className="ce-grid ce-3col" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {projects.map((p: ProjectData) => (
            <Panel key={p.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="ce-mono" style={{ fontSize: 9.5, color: "var(--faint)" }}>{p.id}</span>
                <Tag tone={statusTone(p.status)}>{p.status}</Tag>
              </div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{p.name}</span>
              <span className="ce-serif" style={{ fontSize: 13, fontStyle: "italic", color: "var(--muted)", lineHeight: 1.5 }}>“{p.expected_outcome}”</span>
              <span className="ce-mono" style={{ fontSize: 12, color: "var(--text)" }}>
                ASK {p.funding_requested.toLocaleString()} · ALLOCATED {p.funding_allocated.toLocaleString()}
              </span>
              {p.ai_reasoning && (
                <p style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, fontSize: 11.5, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>{p.ai_reasoning}</p>
              )}
              {p.conditions && (
                <span className="ce-mono" style={{ fontSize: 10, color: "var(--amber)" }}>CONDITIONS: {p.conditions}</span>
              )}
            </Panel>
          ))}
        </div>
      )}
    </AppShell>
  );
}
