"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SANS, MONO, SERIF, GR, OR, CYC, AppNav, PulseTicker, panel, monoLabel, ThinkingDots } from "@/components/compass/ui";
import { useContractWrite, useAllEvents } from "@/hooks/useContract";

/* ─── CREATE VAULT — per Page Blueprints ─────────────────────────────────
   An objective, not a form. Fill-in-the-blank sentence composer +
   constraints + council mandate selection + dry-run simulation.
──────────────────────────────────────────────────────────────────────── */

const GOALS = ["steady income", "aggressive growth", "capital preservation"];
const RISKS = ["minimal", "moderate", "elevated"];
const HORIZONS = ["3 months", "12 months", "36 months"];

const MANDATES = [
  { glyph: "RSK", name: "Risk Analyst", copy: "Argues the downside. Vetoes anything that breaches the mandate's tolerance.", ...GR },
  { glyph: "YLD", name: "Yield Analyst", copy: "Hunts carry. Prices every idle unit of capital against its best alternative.", ...GR },
  { glyph: "LIQ", name: "Liquidity Analyst", copy: "Guards the exits. No position without a priced path back to reserves.", ...CYC },
  { glyph: "MAC", name: "Macro Analyst", copy: "Reads the weather. Separates regime change from noise — and dissents on record.", ...OR },
];

function Slot({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <span
      onClick={() => onChange(options[(options.indexOf(value) + 1) % options.length])}
      title="Click to change"
      style={{ borderBottom: "1px solid #7fd4d4", color: "#7fd4d4", padding: "0 6px", cursor: "pointer", userSelect: "none" }}
    >
      {value}
    </span>
  );
}

export default function CreateVaultPage() {
  const router = useRouter();
  const { execute, loading: deploying, error: writeError } = useContractWrite();
  const { data: events } = useAllEvents();
  const [goal, setGoal] = useState(GOALS[0]);
  const [risk, setRisk] = useState(RISKS[1]);
  const [horizon, setHorizon] = useState(HORIZONS[1]);
  const [constraints, setConstraints] = useState<string[]>(["Keep at least 20% in reserves at all times."]);
  const [draft, setDraft] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simulated, setSimulated] = useState(false);

  const addConstraint = () => {
    if (!draft.trim()) return;
    setConstraints((c) => [...c, draft.trim()]);
    setDraft("");
  };

  const runSimulation = () => {
    setSimulating(true);
    setSimulated(false);
    setTimeout(() => {
      setSimulating(false);
      setSimulated(true);
    }, 2400);
  };

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="CREATE VAULT" active="Vaults" />
      <PulseTicker />

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>NEW TREASURY · GENESIS</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>An objective, not a form.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            State the mandate. The council you choose will argue about everything else — in public, forever.
          </p>
        </div>

        {/* ZONE 1 · SENTENCE — objective composer */}
        <div style={{ ...panel, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          <span style={{ ...monoLabel, letterSpacing: ".2em" }}>OBJECTIVE — CLICK THE UNDERLINED SLOTS</span>
          <div style={{ font: `400 26px/1.6 ${SERIF}`, fontStyle: "italic", color: "rgba(236,235,230,.9)" }}>
            Grow this treasury toward <Slot value={goal} options={GOALS} onChange={setGoal} /> with at most{" "}
            <Slot value={risk} options={RISKS} onChange={setRisk} /> risk, over <Slot value={horizon} options={HORIZONS} onChange={setHorizon} />.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={monoLabel}>CONSTRAINTS THE COUNCIL MUST RESPECT</span>
            {constraints.map((c, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", font: `400 13px ${SANS}`, color: "rgba(236,235,230,.75)" }}>
                <span style={{ color: "#7fd4d4", font: `400 10px ${MONO}` }}>{String(i + 1).padStart(2, "0")}</span>
                {c}
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addConstraint()}
                placeholder="Add a constraint the council must respect…"
                className="ce-input"
                style={{ flex: 1, font: `400 14px ${SANS}`, padding: "12px 16px", borderRadius: 8, border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)", color: "#ecebe6", outline: "none" }}
              />
              <button onClick={addConstraint} style={{ font: `600 13px ${SANS}`, padding: "12px 18px", borderRadius: 8, border: "none", background: "rgba(127,212,212,.15)", color: "#7fd4d4", cursor: "pointer" }}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* ZONE 2 · COUNCIL — mandate preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span style={monoLabel}>THE COUNCIL — FOUR MANDATES, ALWAYS SEATED</span>
          <div className="ce-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
            {MANDATES.map((m) => (
              <div key={m.glyph} style={{ border: `1px solid ${m.border}`, borderRadius: 10, padding: 18, background: "#0a0f1a", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 6, display: "grid", placeItems: "center", background: m.bg, color: m.fg, font: `500 9px ${MONO}` }}>{m.glyph}</span>
                  <span style={{ font: `500 13px ${SANS}` }}>{m.name}</span>
                </div>
                <span style={{ font: `400 12px/1.6 ${SANS}`, color: "rgba(236,235,230,.6)" }}>{m.copy}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ZONE 3 · SIMULATE */}
        <div style={{ ...panel, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...monoLabel, letterSpacing: ".2em" }}>DRY-RUN · LAST 30 DAYS OF EVENTS</span>
            {simulating && <ThinkingDots size={5} />}
          </div>

          {!simulating && !simulated && (
            <p style={{ margin: 0, font: `400 13.5px/1.6 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
              Before deployment, the council deliberates your objective against the last 30 days of recorded economic
              events — so you can read how it would have reasoned before a single unit moves.
            </p>
          )}

          {simulating && (
            <div style={{ font: `italic 400 16px/1.5 ${SERIF}`, color: "rgba(236,235,230,.7)", animation: "ceRise .4s ease-out both" }}>
              &quot;Council convened. Weighing {goal} against the June rate event…&quot;
            </div>
          )}

          {simulated && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "ceRise .4s ease-out both" }}>
              {events.length > 0 ? events.map((ev) => (
                <div key={ev.id} style={{ display: "flex", gap: 12, alignItems: "baseline", borderBottom: "1px solid rgba(236,235,230,.06)", paddingBottom: 10 }}>
                  <span style={{ flex: "none", font: `500 9.5px ${MONO}`, color: ev.severity > 6 ? "#d6926a" : "#7fd4d4", letterSpacing: ".1em" }}>{ev.event_type.toUpperCase()} · SEV {ev.severity}</span>
                  <span style={{ font: `400 13px/1.55 ${SANS}`, color: "rgba(236,235,230,.75)" }}>{ev.impact}</span>
                </div>
              )) : (
                <div style={{ font: `400 13px/1.55 ${SANS}`, color: "rgba(236,235,230,.55)" }}>
                  No economic events on record yet. The council would operate from the stated objective alone — {goal}, {risk} risk, {horizon} horizon.
                </div>
              )}
              <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
                {events.length > 0 ? `SIMULATED AGAINST ${events.length} ONCHAIN EVENTS` : "NO EVENTS TO SIMULATE AGAINST"}
              </span>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button className="ce-btn-secondary" onClick={runSimulation} disabled={simulating} style={{ font: `500 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, opacity: simulating ? 0.5 : 1 }}>
              {simulating ? "Council deliberating…" : "Run dry-run"}
            </button>
            <button
              className="ce-btn-primary"
              style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, opacity: simulated && !deploying ? 1 : 0.45, cursor: simulated && !deploying ? "pointer" : "not-allowed" }}
              disabled={!simulated || deploying}
              onClick={async () => {
                const stratMap: Record<string, string> = { "steady income": "conservative", "aggressive growth": "growth", "capital preservation": "balanced" };
                const strategy = stratMap[goal] || "balanced";
                const objective = `${goal}, ${risk} risk, ${horizon} horizon. Constraints: ${constraints.join("; ")}`;
                try {
                  await execute("VaultManager", "create_vault", [
                    `Vault-${Date.now().toString(36)}`, strategy, objective, risk === "minimal" ? 3 : risk === "moderate" ? 5 : 7, "institutional",
                  ]);
                  router.push("/vaults");
                } catch { /* error shown by hook */ }
              }}
            >
              {deploying ? "Deploying to GenLayer…" : "Deploy — write genesis decision №1"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
