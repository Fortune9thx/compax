"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SANS, MONO, SERIF, GR, OR, Logo, ThinkingDots } from "@/components/compass/ui";
import { useVault, useRebalanceHistory, useContractWrite, useActiveEvent, RebalanceRecord } from "@/hooks/useContract";

type Layer = "brain" | "treasury" | "history";

const panelS: React.CSSProperties = {
  border: "1px solid rgba(236,235,230,.1)",
  borderRadius: 12,
  background: "#0a0f1a",
};

const label: React.CSSProperties = {
  font: `400 10px ${MONO}`,
  color: "rgba(236,235,230,.45)",
};

export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params?.id as string;
  const { data: vault, loading, refetch } = useVault(vaultId);
  const { data: history, refetch: refetchHistory } = useRebalanceHistory(vaultId);
  const { data: activeEvent } = useActiveEvent();
  const { execute, loading: writing, error: writeError } = useContractWrite();
  const [layer, setLayer] = useState<Layer>("brain");
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const tabStyle = (id: Layer): React.CSSProperties =>
    layer === id
      ? { font: `600 13px ${SANS}`, padding: "10px 22px", border: "none", borderBottom: "2px solid #7fd4d4", background: "transparent", color: "#7fd4d4", cursor: "pointer" }
      : { font: `500 13px ${SANS}`, padding: "10px 22px", border: "none", borderBottom: "2px solid transparent", background: "transparent", color: "rgba(236,235,230,.55)", cursor: "pointer" };

  const doDeposit = async () => {
    if (!depositAmt) return;
    try {
      await execute("VaultManager", "deposit", [vaultId], BigInt(depositAmt));
      setDepositAmt("");
      refetch();
    } catch { /* handled */ }
  };

  const doWithdraw = async () => {
    if (!withdrawAmt) return;
    try {
      await execute("VaultManager", "withdraw", [vaultId, parseInt(withdrawAmt)]);
      setWithdrawAmt("");
      refetch();
    } catch { /* handled */ }
  };

  const doRebalance = async () => {
    const ctx = activeEvent ? `${activeEvent.name}: ${activeEvent.description} (severity ${activeEvent.severity})` : "";
    try {
      await execute("VaultManager", "rebalance_vault", [vaultId, ctx]);
      refetch();
      refetchHistory();
    } catch { /* handled */ }
  };

  if (loading) {
    return (
      <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <span style={{ font: `400 13px ${MONO}`, color: "#7fd4d4" }}>READING VAULT {vaultId} FROM GENLAYER…</span>
      </main>
    );
  }

  if (!vault) {
    return (
      <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <span style={{ font: `italic 400 18px ${SERIF}`, color: "rgba(236,235,230,.5)" }}>Vault not found onchain.</span>
          <Link href="/vaults" style={{ font: `600 14px ${SANS}`, padding: "12px 24px", borderRadius: 7, background: "#7fd4d4", color: "#070a12", textDecoration: "none" }}>
            Back to vaults
          </Link>
        </div>
      </main>
    );
  }

  const alloc = [
    { name: "LENDING", pct: vault.allocation_lending, bar: "#7fd4d4" },
    { name: "STAKING", pct: vault.allocation_staking, bar: "#6fbf8f" },
    { name: "PREDICTIONS", pct: vault.allocation_predictions, bar: "#d6926a" },
    { name: "BUILDERS", pct: vault.allocation_builders, bar: "rgba(236,235,230,.5)" },
  ];

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 40px", background: "rgba(7,10,18,.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(236,235,230,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Link href="/" style={{ display: "flex" }}><Logo size={22} /></Link>
          <span style={{ font: `600 15px ${SANS}` }}>COMPASS</span>
          <span style={{ font: `400 11px ${MONO}`, color: "rgba(236,235,230,.4)", borderLeft: "1px solid rgba(236,235,230,.15)", paddingLeft: 11 }}>
            <Link href="/vaults" style={{ color: "rgba(236,235,230,.5)" }}>VAULTS</Link> / {vault.name.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ font: `400 10.5px ${MONO}`, color: "#7fd4d4", animation: "cePulse 2s infinite" }}>● {vault.id}</span>
          <button className="ce-btn-primary" onClick={doRebalance} disabled={writing} style={{ font: `600 12.5px ${SANS}`, padding: "8px 16px", borderRadius: 6, opacity: writing ? 0.5 : 1 }}>
            {writing ? "Rebalancing…" : "Rebalance"}
          </button>
        </div>
      </nav>

      {/* HEADER */}
      <header style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 style={{ margin: 0, font: `300 40px/1.1 ${SANS}`, letterSpacing: "-.015em" }}>{vault.name}</h1>
          <div style={{ font: `italic 400 19px/1.4 ${SERIF}`, color: "rgba(236,235,230,.65)" }}>
            &quot;{vault.objective}&quot;
          </div>
        </div>
        <div style={{ display: "flex", gap: 32, font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
          {[
            { k: "TREASURY", v: vault.treasury.toLocaleString(), c: "#ecebe6" },
            { k: "STRATEGY", v: vault.strategy.toUpperCase(), c: "#7fd4d4" },
            { k: "RISK", v: `${vault.risk_tolerance}/10`, c: vault.risk_tolerance > 6 ? "#d6926a" : "#6fbf8f" },
            { k: "DEPOSITS", v: String(vault.deposit_count), c: "#7fd4d4" },
          ].map((m) => (
            <div key={m.k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span>{m.k}</span>
              <span style={{ font: `500 20px ${MONO}`, color: m.c }}>{m.v}</span>
            </div>
          ))}
        </div>
      </header>

      {writeError && (
        <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ padding: "10px 16px", background: "rgba(214,146,106,.1)", border: "1px solid rgba(214,146,106,.3)", borderRadius: 8, font: `400 12px ${MONO}`, color: "#d6926a" }}>
            {writeError}
          </div>
        </div>
      )}

      {/* LAYER SWITCH */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 40px 0", display: "flex", gap: 8, borderBottom: "1px solid rgba(236,235,230,.08)" }}>
        <button style={tabStyle("brain")} onClick={() => setLayer("brain")}>Brain</button>
        <button style={tabStyle("treasury")} onClick={() => setLayer("treasury")}>Treasury</button>
        <button style={tabStyle("history")} onClick={() => setLayer("history")}>History</button>
      </div>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 40px 96px" }}>
        {/* BRAIN LAYER */}
        {layer === "brain" && (
          <div key="brain" className="ce-2col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, animation: "ceRise .4s ease-out both" }}>
            <div style={{ ...panelS, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
                <span>VAULT BRAIN · AI COUNCIL</span>
                {activeEvent && <span style={{ color: "#d6926a" }}>ACTIVE EVENT: {activeEvent.name.toUpperCase()}</span>}
              </div>
              <div style={{ font: `italic 400 19px/1.4 ${SERIF}` }}>&quot;{vault.objective}&quot;</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { glyph: "RSK", name: "Risk Analyst", copy: `Risk tolerance ${vault.risk_tolerance}/10. ${vault.risk_tolerance <= 3 ? "Conservative posture." : "Elevated tolerance."}`, ...GR },
                  { glyph: "YLD", name: "Yield Analyst", copy: `Strategy: ${vault.strategy}. Treasury: ${vault.treasury.toLocaleString()} cGEN.`, ...GR },
                  { glyph: "LIQ", name: "Liquidity Analyst", copy: `${vault.deposit_count} deposits on record. ${vault.allocation_staking}% in staking.`, ...(vault.allocation_staking > 40 ? OR : GR) },
                  { glyph: "MAC", name: "Macro Analyst", copy: activeEvent ? `Active event: ${activeEvent.name} (severity ${activeEvent.severity}).` : "No active macro events.", ...(activeEvent ? OR : GR) },
                ].map((d) => (
                  <div key={d.glyph} style={{ border: `1px solid ${d.border}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 9 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: 5, display: "grid", placeItems: "center", background: d.bg, color: d.fg, font: `500 8.5px ${MONO}` }}>{d.glyph}</span>
                      <span style={{ font: `500 13px ${SANS}` }}>{d.name}</span>
                    </div>
                    <span style={{ font: `400 12.5px/1.55 ${SANS}`, color: "rgba(236,235,230,.65)" }}>{d.copy}</span>
                  </div>
                ))}
              </div>

              {vault.last_rebalance_reason && (
                <div style={{ border: "1px solid rgba(127,212,212,.35)", borderRadius: 8, padding: 16, background: "rgba(127,212,212,.06)" }}>
                  <div style={{ font: `500 9.5px ${MONO}`, color: "#7fd4d4", letterSpacing: ".15em" }}>LAST COUNCIL DECISION</div>
                  <div style={{ font: `400 14px/1.5 ${SANS}`, marginTop: 6 }}>{vault.last_rebalance_reason}</div>
                </div>
              )}
            </div>

            {/* DEPOSIT / WITHDRAW */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={label}>DEPOSIT · FUND THIS VAULT</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Amount (wei)" style={{ flex: 1, font: `400 13px ${MONO}`, padding: "10px 14px", borderRadius: 7, border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)", color: "#ecebe6", outline: "none" }} />
                  <button className="ce-btn-primary" onClick={doDeposit} disabled={writing || !depositAmt} style={{ font: `600 13px ${SANS}`, padding: "10px 18px", borderRadius: 7, opacity: writing ? 0.5 : 1 }}>
                    {writing ? "…" : "Deposit"}
                  </button>
                </div>
              </div>
              <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={label}>WITHDRAW</span>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} placeholder="Amount (wei)" style={{ flex: 1, font: `400 13px ${MONO}`, padding: "10px 14px", borderRadius: 7, border: "1px solid rgba(236,235,230,.18)", background: "rgba(7,10,18,.5)", color: "#ecebe6", outline: "none" }} />
                  <button className="ce-btn-secondary" onClick={doWithdraw} disabled={writing || !withdrawAmt} style={{ font: `500 13px ${SANS}`, padding: "10px 18px", borderRadius: 7 }}>
                    Withdraw
                  </button>
                </div>
              </div>
              {activeEvent && (
                <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={label}>ACTIVE ECONOMIC EVENT</span>
                  <span style={{ font: `500 14px ${SANS}`, color: "#d6926a" }}>{activeEvent.name}</span>
                  <span style={{ font: `400 12.5px/1.55 ${SANS}`, color: "rgba(236,235,230,.65)" }}>{activeEvent.description}</span>
                  <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>SEVERITY {activeEvent.severity}/10 · {activeEvent.impact}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TREASURY LAYER */}
        {layer === "treasury" && (
          <div key="treasury" className="ce-2col" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, animation: "ceRise .4s ease-out both" }}>
            <div style={{ ...panelS, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", ...label }}>
                <span>CAPITAL ENGINE · THIS VAULT</span>
                <span style={{ color: "#7fd4d4" }}>ALLOCATION LIVE FROM GENLAYER</span>
              </div>
              <svg width="100%" viewBox="0 0 640 300" style={{ display: "block" }}>
                <defs>
                  <marker id="va" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#7fd4d4" /></marker>
                </defs>
                <rect x="30" y="60" width="180" height="180" rx="10" fill="#10182a" stroke="rgba(127,212,212,.45)" strokeWidth="1.4" />
                <clipPath id="vc"><rect x="31" y="61" width="178" height="178" rx="9" /></clipPath>
                <g clipPath="url(#vc)"><rect x="31" y="80" width="178" height="1.5" fill="rgba(127,212,212,.35)" style={{ animation: "ceScan 3.2s linear infinite alternate" }} /></g>
                <text x="120" y="100" textAnchor="middle" fill="rgba(236,235,230,.5)" style={{ font: `500 9px ${MONO}` }} letterSpacing="2">TREASURY BRAIN</text>
                <text x="120" y="130" textAnchor="middle" fill="#ecebe6" style={{ font: `500 22px ${MONO}` }}>{vault.treasury.toLocaleString()}</text>
                <text x="120" y="150" textAnchor="middle" fill="rgba(236,235,230,.45)" style={{ font: `400 9px ${MONO}` }}>cGEN</text>
                {alloc.map((a, i) => {
                  const y = 60 + i * 55;
                  return (
                    <g key={a.name}>
                      <rect x="420" y={y} width="190" height="42" rx="7" fill="#10182a" stroke="rgba(236,235,230,.18)" />
                      <text x="436" y={y + 18} fill="#ecebe6" style={{ font: `500 11px ${SANS}` }}>{a.name}</text>
                      <text x="436" y={y + 33} fill={a.bar} style={{ font: `400 9px ${MONO}` }}>{a.pct}%</text>
                      <path d={`M210,${150} C320,${150} 350,${y + 21} 420,${y + 21}`} fill="none" stroke={a.bar} strokeWidth="1.2" strokeDasharray="4 12" markerEnd="url(#va)" style={{ animation: "ceFlow 3.4s linear infinite" }} />
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
                <span style={label}>ALLOCATION BREAKDOWN</span>
                {alloc.map((a) => (
                  <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 90, font: `400 10px ${MONO}`, color: "rgba(236,235,230,.55)" }}>{a.name}</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(236,235,230,.07)", overflow: "hidden" }}>
                      <div style={{ width: `${a.pct}%`, height: "100%", background: a.bar, borderRadius: 5 }} />
                    </div>
                    <span style={{ width: 40, font: `500 11px ${MONO}`, color: a.bar, textAlign: "right" }}>{a.pct}%</span>
                  </div>
                ))}
              </div>
              <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={label}>VAULT METADATA</span>
                {[
                  { k: "OWNER", v: vault.owner },
                  { k: "STRATEGY", v: vault.strategy },
                  { k: "PERSONALITY", v: vault.personality },
                  { k: "ID", v: vault.id },
                ].map((m) => (
                  <div key={m.k} style={{ display: "flex", justifyContent: "space-between", font: `400 11px ${MONO}`, borderBottom: "1px solid rgba(236,235,230,.06)", paddingBottom: 8 }}>
                    <span style={{ color: "rgba(236,235,230,.45)" }}>{m.k}</span>
                    <span style={{ color: "rgba(236,235,230,.7)" }}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY LAYER */}
        {layer === "history" && (
          <div key="history" style={{ animation: "ceRise .4s ease-out both" }}>
            <div style={{ ...panelS, overflow: "hidden" }}>
              <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(236,235,230,.08)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ font: `500 15px ${SANS}` }}>Rebalance history</span>
                <span style={label}>ONCHAIN · {history.length} REBALANCES</span>
              </div>
              {history.length === 0 && (
                <div style={{ padding: "32px 24px", textAlign: "center" }}>
                  <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.4)" }}>
                    No rebalances yet. Trigger a rebalance to see the council reason over this vault.
                  </span>
                </div>
              )}
              {history.map((r: RebalanceRecord, i: number) => (
                <div key={i} className="ce-row-hover" style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr", gap: 12, padding: "14px 24px", borderBottom: "1px solid rgba(236,235,230,.06)", alignItems: "baseline" }}>
                  <span style={{ font: `400 11px ${MONO}`, color: "rgba(236,235,230,.45)" }}>#{i + 1}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ font: `400 13px ${SANS}`, color: "rgba(236,235,230,.85)" }}>{r.reason}</span>
                    <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
                      L:{r.old_lending}→{r.new_lending} S:{r.old_staking}→{r.new_staking} P:{r.old_predictions}→{r.new_predictions} B:{r.old_builders}→{r.new_builders}
                    </span>
                  </div>
                  <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
                    {r.event_context ? `EVENT: ${r.event_context.slice(0, 60)}…` : "NO EVENT CONTEXT"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
