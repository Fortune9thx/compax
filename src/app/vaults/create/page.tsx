"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/compax/AppShell";
import { AllocationPanel } from "@/components/compax/Allocation";
import { PageHead, Panel, EmptyState } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useContractWrite, useAllEvents } from "@/hooks/useContract";

const GOALS = ["steady income", "aggressive growth", "capital preservation"];
const RISKS = ["minimal", "moderate", "elevated"];
const HORIZONS = ["3 months", "12 months", "36 months"];

// Representative allocation preview per objective → feeds the Engine.
const PREVIEW: Record<string, { staking: number; lending: number; builders: number; predictions: number }> = {
  "steady income": { staking: 30, lending: 45, builders: 10, predictions: 15 },
  "aggressive growth": { staking: 10, lending: 20, builders: 35, predictions: 35 },
  "capital preservation": { staking: 45, lending: 35, builders: 12, predictions: 8 },
};

function Slot({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <button className="ce-slot" onClick={() => onChange(options[(options.indexOf(value) + 1) % options.length])}>
      {value}
    </button>
  );
}

export default function CreateVaultPage() {
  const router = useRouter();
  const { execute, loading: deploying } = useContractWrite();
  const { data: events } = useAllEvents();
  const { tx, run, reset } = useTxStatus();

  const [goal, setGoal] = useState(GOALS[0]);
  const [risk, setRisk] = useState(RISKS[1]);
  const [horizon, setHorizon] = useState(HORIZONS[1]);
  const [constraints, setConstraints] = useState<string[]>(["Keep at least 20% in reserves at all times."]);
  const [draft, setDraft] = useState("");
  const [simulated, setSimulated] = useState(false);

  const addConstraint = () => {
    if (!draft.trim()) return;
    setConstraints((c) => [...c, draft.trim()]);
    setDraft("");
  };

  const deploy = async () => {
    const stratMap: Record<string, string> = {
      "steady income": "conservative",
      "aggressive growth": "growth",
      "capital preservation": "balanced",
    };
    const strategy = stratMap[goal] || "balanced";
    const objective = `${goal}, ${risk} risk, ${horizon} horizon. Constraints: ${constraints.join("; ")}`;
    const r = await run(() =>
      execute("VaultManager", "create_vault", [
        `Vault-${Date.now().toString(36)}`,
        strategy,
        objective,
        risk === "minimal" ? 3 : risk === "moderate" ? 5 : 7,
        "institutional",
      ]),
    );
    if (r.ok) setTimeout(() => router.push("/vaults"), 900);
  };

  return (
    <AppShell>
      <PageHead title="New vault" meta="Vaults / New" />

      <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Panel style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <span className="ce-section-label">Objective</span>
            <div className="ce-serif" style={{ fontSize: 24, lineHeight: 1.6, fontStyle: "italic", color: "var(--text)" }}>
              Grow this treasury toward <Slot value={goal} options={GOALS} onChange={(v) => { setGoal(v); setSimulated(false); }} /> with at most{" "}
              <Slot value={risk} options={RISKS} onChange={setRisk} /> risk, over <Slot value={horizon} options={HORIZONS} onChange={setHorizon} />.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="ce-section-label">Constraints</span>
              {constraints.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, color: "var(--muted)" }}>
                  <span className="ce-mono" style={{ color: "var(--primary)", fontSize: 10 }}>{String(i + 1).padStart(2, "0")}</span>
                  {c}
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <input className="ce-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addConstraint()} placeholder="Add a constraint…" />
                <button className="ce-btn ce-btn-ghost" onClick={addConstraint}>Add</button>
              </div>
            </div>
          </Panel>

          <Panel style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="ce-section-label">Dry run</span>
            {!simulated ? (
              <EmptyState>Run a dry run before deploying.</EmptyState>
            ) : events.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, animation: "ceRise .35s ease-out both" }}>
                {events.slice(-4).map((ev) => (
                  <div key={ev.id} style={{ display: "flex", gap: 12, alignItems: "baseline", borderBottom: "1px solid var(--line-soft)", paddingBottom: 10 }}>
                    <span className="ce-mono" style={{ flex: "none", fontSize: 9.5, color: ev.severity > 6 ? "var(--amber)" : "var(--signal)" }}>{ev.event_type.toUpperCase()} · SEV {ev.severity}</span>
                    <span style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>{ev.impact}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState>No events on record.</EmptyState>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="ce-btn ce-btn-ghost" onClick={() => setSimulated(true)}>Run dry run</button>
              <button className="ce-btn" onClick={deploy} disabled={!simulated || deploying || tx.phase === "deliberating"}>
                {tx.phase === "deliberating" ? "Deploying…" : "Deploy vault"}
              </button>
            </div>
            {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
          </Panel>
        </div>

        {/* live preview */}
        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <AllocationPanel
            label="Projected allocation"
            allocation={PREVIEW[goal]}
            normalize
            votes={[null, null, null, null, null]}
          />
        </div>
      </div>
    </AppShell>
  );
}
