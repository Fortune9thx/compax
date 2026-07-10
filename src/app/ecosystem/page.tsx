"use client";

import Link from "next/link";
import { SANS, MONO, SERIF, Logo, ThinkingDots } from "@/components/compass/ui";
import { useTotalTVL, useVaultCount, useEventCount, useTotalVolume, useTotalBorrowed, useTotalAllocated, useAllVaults, useAllEvents, useAllMarkets, VaultData, EventData } from "@/hooks/useContract";

const panelS: React.CSSProperties = {
  border: "1px solid rgba(236,235,230,.1)",
  borderRadius: 12,
  background: "#0a0f1a",
};

const NAV_LINKS = [
  { label: "Overview", href: "/ecosystem", active: true },
  { label: "Vaults", href: "/vaults" },
  { label: "Lending", href: "/lending" },
  { label: "Builders", href: "/builders" },
  { label: "Predictions", href: "/predictions" },
  { label: "Record", href: "/reputation" },
];

export default function EcosystemPage() {
  const { data: tvl } = useTotalTVL();
  const { data: vaultCount } = useVaultCount();
  const { data: eventCount } = useEventCount();
  const { data: totalVolume } = useTotalVolume();
  const { data: totalBorrowed } = useTotalBorrowed();
  const { data: totalAllocated } = useTotalAllocated();
  const { data: vaults } = useAllVaults();
  const { data: events } = useAllEvents();
  const { data: markets } = useAllMarkets();

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 40px", background: "rgba(7,10,18,.85)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(236,235,230,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Link href="/" style={{ display: "flex" }}><Logo size={22} /></Link>
          <span style={{ font: `600 15px ${SANS}` }}>COMPASS</span>
          <span style={{ font: `400 11px ${MONO}`, color: "rgba(236,235,230,.4)", borderLeft: "1px solid rgba(236,235,230,.15)", paddingLeft: 11 }}>ECOSYSTEM OVERVIEW</span>
        </div>
        <div style={{ display: "flex", gap: 26, font: `400 13px ${SANS}` }}>
          {NAV_LINKS.map((l) =>
            l.active ? (
              <Link key={l.label} href={l.href} style={{ color: "#7fd4d4" }}>{l.label}</Link>
            ) : (
              <Link key={l.label} className="ce-navlink" href={l.href}>{l.label}</Link>
            )
          )}
        </div>
        <span style={{ font: `400 10.5px ${MONO}`, color: "#7fd4d4", animation: "cePulse 2s infinite" }}>● {vaultCount} VAULTS · {events.filter((e) => e.is_active).length} ACTIVE EVENTS</span>
      </nav>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 40px 96px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* ECONOMY MAP */}
        <div style={{ ...panelS, padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
            <span>ECONOMY MAP · ALL CAPITAL · LIVE FROM GENLAYER</span>
            <span>TVL {tvl.toLocaleString()} · {vaultCount} VAULTS · {eventCount} EVENTS · BORROWED {totalBorrowed.toLocaleString()} · FUNDED {totalAllocated.toLocaleString()}</span>
          </div>
          <svg width="100%" viewBox="0 0 1280 400" style={{ display: "block" }}>
            <defs>
              <marker id="ea" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#7fd4d4" />
              </marker>
            </defs>
            <g stroke="rgba(236,235,230,.04)">
              <line x1="0" y1="100" x2="1280" y2="100" /><line x1="0" y1="200" x2="1280" y2="200" /><line x1="0" y1="300" x2="1280" y2="300" />
              <line x1="320" y1="0" x2="320" y2="400" /><line x1="640" y1="0" x2="640" y2="400" /><line x1="960" y1="0" x2="960" y2="400" />
            </g>

            {/* Vault nodes — dynamically rendered from chain */}
            {vaults.length > 0 ? vaults.map((v: VaultData, i: number) => {
              const y = 60 + i * 110;
              const w = Math.max(160, Math.min(240, 160 + v.treasury / 100));
              return (
                <Link key={v.id} href={`/vaults/${v.id}`}>
                  <g style={{ cursor: "pointer" }}>
                    <rect x="60" y={y} width={w} height="72" rx="9" fill="#10182a" stroke="rgba(127,212,212,.5)" strokeWidth="1.4" />
                    <circle cx="78" cy={y + 18} r="3.5" fill="#7fd4d4" style={{ animation: "cePulse 1.6s infinite" }} />
                    <text x="92" y={y + 23} fill="#ecebe6" style={{ font: `500 13px ${SANS}` }}>{v.name.toUpperCase()}</text>
                    <text x="78" y={y + 46} fill="rgba(236,235,230,.5)" style={{ font: `400 9.5px ${MONO}` }}>{v.treasury.toLocaleString()} cGEN · {v.strategy.toUpperCase()}</text>
                    <text x="78" y={y + 61} fill="#6fbf8f" style={{ font: `400 9.5px ${MONO}` }}>{v.id}</text>
                  </g>
                </Link>
              );
            }) : (
              <text x="160" y="200" fill="rgba(236,235,230,.35)" style={{ font: `italic 400 14px ${SERIF}` }}>No vaults deployed yet</text>
            )}

            {/* Market nodes */}
            <g style={{ font: `400 9.5px ${MONO}` }}>
              <rect x="560" y="60" width="180" height="58" rx="9" fill="#10182a" stroke="rgba(236,235,230,.18)" />
              <text x="578" y="84" fill="#ecebe6" style={{ font: `500 12.5px ${SANS}` }}>LENDING MARKET</text>
              <text x="578" y="104" fill="rgba(236,235,230,.5)">{totalBorrowed.toLocaleString()} DEPLOYED</text>
              <rect x="560" y="170" width="180" height="58" rx="9" fill="#10182a" stroke="rgba(236,235,230,.18)" />
              <text x="578" y="194" fill="#ecebe6" style={{ font: `500 12.5px ${SANS}` }}>BUILDER FUNDING</text>
              <text x="578" y="214" fill="rgba(236,235,230,.5)">{totalAllocated.toLocaleString()} ALLOCATED</text>
              <rect x="560" y="280" width="180" height="58" rx="9" fill="#10182a" stroke="rgba(236,235,230,.18)" />
              <text x="578" y="304" fill="#ecebe6" style={{ font: `500 12.5px ${SANS}` }}>PREDICTIONS</text>
              <text x="578" y="324" fill="rgba(236,235,230,.5)">{totalVolume.toLocaleString()} VOL · {markets.filter((m) => m.status === "active").length} OPEN</text>
              <rect x="1020" y="160" width="200" height="80" rx="9" fill="#0d1420" stroke="rgba(127,212,212,.35)" />
              <text x="1040" y="188" fill="#ecebe6" style={{ font: `500 12.5px ${SANS}` }}>THE RECORD</text>
              <text x="1040" y="208" fill="rgba(236,235,230,.5)">{eventCount} EVENTS</text>
              <text x="1040" y="226" fill="#7fd4d4">GENLAYER · IMMUTABLE</text>
            </g>

            {/* Flows */}
            {vaults.length > 0 && (
              <>
                <path d="M260,96 C420,96 420,89 560,89" fill="none" stroke="#7fd4d4" strokeWidth="1.4" strokeDasharray="4 12" markerEnd="url(#ea)" style={{ animation: "ceFlow 3.2s linear infinite" }} />
                <path d="M260,96 C400,140 420,199 560,199" fill="none" stroke="rgba(127,212,212,.7)" strokeWidth="1.1" strokeDasharray="4 14" markerEnd="url(#ea)" style={{ animation: "ceFlow 4.4s linear infinite" }} />
                <path d="M260,96 C420,200 430,309 560,309" fill="none" stroke="rgba(127,212,212,.6)" strokeWidth="1.2" strokeDasharray="4 13" markerEnd="url(#ea)" style={{ animation: "ceFlow 3.8s linear infinite" }} />
              </>
            )}
            <path d="M740,89 C900,89 900,180 1020,185" fill="none" stroke="rgba(236,235,230,.4)" strokeWidth="1" strokeDasharray="3 14" markerEnd="url(#ea)" style={{ animation: "ceFlow 4.8s linear infinite" }} />
            <path d="M740,199 C900,199 900,200 1020,200" fill="none" stroke="rgba(236,235,230,.4)" strokeWidth="1" strokeDasharray="3 14" markerEnd="url(#ea)" style={{ animation: "ceFlow 4.2s linear infinite" }} />
            <path d="M740,309 C900,309 900,222 1020,215" fill="none" stroke="rgba(236,235,230,.4)" strokeWidth="1" strokeDasharray="3 14" markerEnd="url(#ea)" style={{ animation: "ceFlow 5.6s linear infinite" }} />

            {/* Active events propagation */}
            {events.filter((e: EventData) => e.is_active).map((e: EventData, i: number) => (
              <g key={e.id}>
                <circle cx={440 + i * 60} cy={40} r="5" fill="#d6926a" />
                <circle cx={440 + i * 60} cy={40} r="6" fill="none" stroke="rgba(214,146,106,.6)" strokeWidth="1" style={{ animation: "ceProp 2.4s ease-out infinite" }} />
                <text x={454 + i * 60} y="44" fill="rgba(214,146,106,.85)" style={{ font: `400 9px ${MONO}` }}>{e.name.toUpperCase()}</text>
              </g>
            ))}
          </svg>
        </div>

        {/* 3-COL RAIL */}
        <div className="ce-3col" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 24 }}>
          {/* VAULTS */}
          <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
              <span>VAULTS · {vaults.length} OPERATING</span>
              {vaults.length > 0 && <ThinkingDots />}
            </div>
            {vaults.length === 0 && (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.4)" }}>No vaults yet.</span>
              </div>
            )}
            {vaults.map((v: VaultData) => (
              <Link key={v.id} href={`/vaults/${v.id}`} style={{ display: "contents", color: "inherit" }}>
                <div className="ce-card-hover" style={{ border: "1px solid rgba(127,212,212,.25)", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", font: `400 9.5px ${MONO}` }}>
                    <span style={{ color: "#7fd4d4" }}>{v.name.toUpperCase()}</span>
                    <span style={{ color: "rgba(236,235,230,.45)" }}>{v.strategy.toUpperCase()}</span>
                  </div>
                  <div style={{ font: `italic 400 14px/1.45 ${SERIF}`, color: "rgba(236,235,230,.65)" }}>&quot;{v.objective.slice(0, 80)}{v.objective.length > 80 ? "…" : ""}&quot;</div>
                  <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.55)" }}>{v.treasury.toLocaleString()} cGEN · {v.last_rebalance_reason || "No rebalance yet"}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* MARKETS */}
          <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)", marginBottom: 12 }}>PREDICTION MARKETS · {markets.length}</div>
            {markets.length === 0 && (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.4)" }}>No markets created.</span>
              </div>
            )}
            {markets.slice(0, 5).map((m) => (
              <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid rgba(236,235,230,.06)", font: `400 11px ${MONO}` }}>
                <span style={{ color: "rgba(236,235,230,.45)", flex: "none" }}>{m.id}</span>
                <span style={{ flex: 1, font: `400 12.5px ${SANS}`, color: "rgba(236,235,230,.85)" }}>{m.question.slice(0, 50)}{m.question.length > 50 ? "…" : ""}</span>
                <span style={{ color: m.status === "active" ? "#7fd4d4" : "#6fbf8f" }}>{m.status === "active" ? "OPEN" : m.outcome?.toUpperCase()}</span>
              </div>
            ))}
            <Link href="/predictions" style={{ font: `500 12px ${SANS}`, marginTop: 12 }}>All markets →</Link>
          </div>

          {/* EVENTS */}
          <div style={{ ...panelS, padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>EVENTS FEED · {events.length} TOTAL</div>
            {events.length === 0 && (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.4)" }}>No events triggered.</span>
              </div>
            )}
            {events.slice(-5).reverse().map((e: EventData) => (
              <div key={e.id} style={{ display: "flex", gap: 10, borderBottom: "1px solid rgba(236,235,230,.06)", paddingBottom: 11 }}>
                <span style={{ flex: "none", width: 7, height: 7, borderRadius: "50%", background: e.is_active ? "#d6926a" : "#6fbf8f", marginTop: 4 }} />
                <div>
                  <div style={{ font: `500 12.5px ${SANS}` }}>{e.name}</div>
                  <div style={{ font: `400 9.5px ${MONO}`, color: "rgba(236,235,230,.45)", marginTop: 2 }}>SEV {e.severity}/10 · {e.is_active ? "ACTIVE" : "RESOLVED"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
