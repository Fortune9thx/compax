"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/compax/AppShell";
import { PageHead, Panel, EmptyState } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useContractWrite, useAllEvents } from "@/hooks/useContract";

const STRATEGIES = [
  { value: "conservative", label: "Conservative" },
  { value: "balanced", label: "Balanced" },
  { value: "growth", label: "Growth" },
  { value: "institutional", label: "Institutional" },
];

export default function CreateVaultPage() {
  const router = useRouter();
  const { execute, loading: deploying } = useContractWrite();
  const { data: events } = useAllEvents();
  const { tx, run, reset } = useTxStatus();

  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState(STRATEGIES[1].value);
  const [objective, setObjective] = useState("");
  const [risk, setRisk] = useState(5);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const addConstraint = () => {
    if (!draft.trim()) return;
    setConstraints((c) => [...c, draft.trim()]);
    setDraft("");
  };

  const removeConstraint = (i: number) => setConstraints((c) => c.filter((_, idx) => idx !== i));

  const canDeploy = name.trim().length > 0 && objective.trim().length > 0 && !deploying && tx.phase !== "deliberating";

  const deploy = async () => {
    if (!canDeploy) return;
    const fullObjective = constraints.length
      ? `${objective.trim()} Constraints: ${constraints.join("; ")}`
      : objective.trim();
    const r = await run(() =>
      execute("VaultManager", "create_vault", [
        name.trim(),
        strategy,
        fullObjective,
        risk,
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
            <span className="ce-section-label">Name</span>
            <input
              className="ce-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Steady Income Vault"
              maxLength={80}
            />

            <span className="ce-section-label">Strategy</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STRATEGIES.map((s) => (
                <button
                  key={s.value}
                  className={`ce-tab${strategy === s.value ? " ce-tab-active" : ""}`}
                  onClick={() => setStrategy(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="ce-section-label">Objective</span>
            <textarea
              className="ce-input"
              style={{ minHeight: 96, resize: "vertical", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 16, lineHeight: 1.5 }}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="State the mandate in your own words — target, risk ceiling, horizon. e.g. Grow this treasury toward steady income with moderate risk over 12 months."
              maxLength={400}
            />
            <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)" }}>
              This is passed directly to the vault council — write it the way you'd explain it to a person.
            </span>

            <span className="ce-section-label">Risk tolerance — {risk}/10</span>
            <input
              type="range"
              min={1}
              max={10}
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value))}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="ce-section-label">Constraints (optional)</span>
              {constraints.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13, color: "var(--muted)" }}>
                  <span className="ce-mono" style={{ color: "var(--primary)", fontSize: 10 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1 }}>{c}</span>
                  <button onClick={() => removeConstraint(i)} className="ce-mono" style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 11 }}>remove</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <input className="ce-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addConstraint()} placeholder="Add a constraint…" />
                <button className="ce-btn ce-btn-ghost" onClick={addConstraint}>Add</button>
              </div>
            </div>
          </Panel>

          <Panel style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span className="ce-section-label">Recent economic events</span>
            {events.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
            <span className="ce-mono" style={{ fontSize: 10, color: "var(--faint)" }}>
              Context the vault council will factor into future rebalances — not a preview of your vault's decisions.
            </span>
            <button className="ce-btn" onClick={deploy} disabled={!canDeploy} style={{ alignSelf: "flex-start" }}>
              {tx.phase === "deliberating" ? "Deploying…" : "Deploy vault"}
            </button>
            {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
          </Panel>
        </div>

        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <Panel style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="ce-section-label">How allocation is set</span>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
              There's no preview here because there's nothing to preview yet — the vault's
              initial split across lending, staking, builders, and predictions is decided by
              the council after deployment, reasoning over your objective, strategy, and risk
              tolerance together with live market data. You'll see the real allocation and its
              reasoning on the vault page once the transaction is accepted.
            </p>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
