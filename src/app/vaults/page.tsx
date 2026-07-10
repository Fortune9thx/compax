"use client";

import { useState } from "react";
import Link from "next/link";
import { SANS, MONO, SERIF, AppNav, PulseTicker, panel, monoLabel } from "@/components/compass/ui";
import { useAllVaults, VaultData } from "@/hooks/useContract";

const OBJECTIVE_FILTERS = ["All objectives", "Income", "Growth", "Preserve"];
const RISK_FILTERS = ["Any risk", "Conservative", "Moderate", "Aggressive"];

function vaultToCard(v: VaultData) {
  const stratMap: Record<string, string> = { conservative: "Preserve", growth: "Growth", balanced: "Income" };
  const riskMap: Record<string, string> = { conservative: "Conservative", growth: "Aggressive", balanced: "Moderate" };
  return {
    slug: v.id, name: v.name, rep: Math.min(99, 50 + v.deposit_count * 5),
    objective: v.objective, yield: v.total_yield > 0 ? `+${v.total_yield}%` : "—",
    decisions: String(v.deposit_count), status: v.last_rebalance_reason || "Awaiting first rebalance",
    live: !!v.last_rebalance, cls: stratMap[v.strategy] || "Income", risk: riskMap[v.strategy] || "Moderate",
    treasury: v.treasury,
  };
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        font: `500 12px ${SANS}`, padding: "8px 16px", borderRadius: 8, cursor: "pointer",
        border: active ? "1px solid rgba(127,212,212,.45)" : "1px solid rgba(236,235,230,.14)",
        background: active ? "rgba(127,212,212,.08)" : "transparent",
        color: active ? "#7fd4d4" : "rgba(236,235,230,.65)",
        transition: "all .18s ease-out",
      }}
    >
      {label}
    </button>
  );
}

export default function VaultMarketplacePage() {
  const { data: chainVaults, loading } = useAllVaults();
  const [objFilter, setObjFilter] = useState("All objectives");
  const [riskFilter, setRiskFilter] = useState("Any risk");

  const VAULTS = chainVaults.map(vaultToCard);

  const filtered = VAULTS.filter(
    (v) =>
      (objFilter === "All objectives" || v.cls === objFilter) &&
      (riskFilter === "Any risk" || v.risk === riskFilter)
  );

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="VAULT MARKETPLACE" active="Vaults" status={`● ${VAULTS.length} OPERATING`} />
      <PulseTicker />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>VAULTS · {VAULTS.length} OPERATING</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>Choose an objective, not a spreadsheet.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Every vault is a treasury bound to a stated objective, run by a council that reasons in public.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={monoLabel}>FILTER BY OBJECTIVE CLASS</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {OBJECTIVE_FILTERS.map((f) => (
              <Chip key={f} label={f} active={objFilter === f} onClick={() => setObjFilter(f)} />
            ))}
          </div>
          <span style={{ ...monoLabel, marginTop: 6 }}>RISK POSTURE</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RISK_FILTERS.map((f) => (
              <Chip key={f} label={f} active={riskFilter === f} onClick={() => setRiskFilter(f)} />
            ))}
          </div>
        </div>

        <div className="ce-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {filtered.map((v) => (
            <Link key={v.slug} href={`/vaults/${v.slug}`} style={{ display: "contents", color: "inherit" }}>
              <div className="ce-card-hover" style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 10, padding: 24, background: "#0a0f1a", display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", animation: "ceRise .5s ease-out both" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ font: `500 17px ${SANS}` }}>{v.name}</span>
                  <span style={{ font: `500 9.5px ${MONO}`, color: "#7fd4d4", border: "1px solid rgba(127,212,212,.35)", borderRadius: 4, padding: "3px 8px" }}>REP {v.rep}</span>
                </div>
                <div style={{ font: `italic 400 13.5px/1.5 ${SERIF}`, color: "rgba(236,235,230,.6)" }}>&quot;{v.objective}&quot;</div>
                <div style={{ display: "flex", gap: 20, marginTop: "auto", font: `500 13px ${MONO}` }}>
                  <span style={{ color: "#6fbf8f" }}>{v.yield}</span>
                  <span style={{ color: "rgba(236,235,230,.6)" }}>{v.treasury.toLocaleString()} cGEN</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, font: `400 10px ${MONO}`, color: "rgba(236,235,230,.5)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: v.live ? "#7fd4d4" : "rgba(236,235,230,.3)", animation: v.live ? "cePulse 1.6s infinite" : undefined }} />
                  {v.status}
                </div>
              </div>
            </Link>
          ))}

          <Link href="/vaults/create" style={{ display: "contents", color: "inherit" }}>
            <div className="ce-card-hover" style={{ border: "1px dashed rgba(127,212,212,.3)", borderRadius: 10, padding: 24, background: "rgba(127,212,212,.03)", display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: 220 }}>
              <span style={{ font: `italic 400 19px/1.45 ${SERIF}`, color: "#7fd4d4" }}>&quot;State your own objective.&quot;</span>
              <span style={{ font: `400 12.5px/1.6 ${SANS}`, color: "rgba(236,235,230,.55)", maxWidth: 240 }}>
                Compose a mandate, choose a council, and deploy a treasury that thinks for itself.
              </span>
              <span style={{ font: `600 13px ${SANS}`, padding: "10px 20px", borderRadius: 7, background: "#7fd4d4", color: "#070a12", marginTop: 6 }}>Create a vault</span>
            </div>
          </Link>
        </div>

        {loading && (
          <div style={{ ...panel, padding: 32, textAlign: "center" }}>
            <span style={{ font: `400 13px ${MONO}`, color: "#7fd4d4" }}>READING ONCHAIN STATE…</span>
          </div>
        )}

        {!loading && VAULTS.length === 0 && (
          <div style={{ ...panel, padding: 48, textAlign: "center", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
            <span style={{ font: `italic 400 18px/1.5 ${SERIF}`, color: "rgba(236,235,230,.55)" }}>
              No vaults deployed yet. Be the first to state an objective.
            </span>
            <Link href="/vaults/create" style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, background: "#7fd4d4", color: "#070a12", textDecoration: "none" }}>
              Create the first vault
            </Link>
          </div>
        )}

        {!loading && VAULTS.length > 0 && filtered.length === 0 && (
          <div style={{ ...panel, padding: 32, textAlign: "center" }}>
            <span style={{ font: `italic 400 15px ${SERIF}`, color: "rgba(236,235,230,.55)" }}>
              No vault holds that mandate yet — state it yourself.
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
