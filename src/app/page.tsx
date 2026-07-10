import Link from "next/link";

/* ─── LANDING — Compass Landing v2 (authoritative handoff) ───────────────
   Pixel-perfect recreation of design_handoff_compass/Compass Landing v2.dc.html
   Institutional sans-first. Serif = reasoning accent only.
──────────────────────────────────────────────────────────────────────── */

const SANS = "var(--font-sans), 'IBM Plex Sans', sans-serif";
const MONO = "var(--font-mono), 'IBM Plex Mono', monospace";
const SERIF = "var(--font-serif), 'Newsreader', serif";

const CY = { bg: "rgba(127,212,212,.15)", fg: "#7fd4d4" };
const GR = { bg: "rgba(111,191,143,.15)", fg: "#6fbf8f" };
const OR = { bg: "rgba(214,146,106,.15)", fg: "#d6926a" };

const COUNCIL = [
  { glyph: "RSK", name: "Risk Analyst", stance: "AGREES", line: "Drawdown odds exceed mandate tolerance by 1.8×.", conf: 88, ...GR },
  { glyph: "YLD", name: "Yield Analyst", stance: "AGREES", line: "Reserve rates now competitive with growth sleeve.", conf: 74, ...GR },
  { glyph: "LIQ", name: "Liquidity Analyst", stance: "AGREES", line: "Exit depth sufficient; slippage under 8bps.", conf: 91, ...GR },
  { glyph: "MAC", name: "Macro Analyst", stance: "DISSENTS", line: "The rate signal is noise. Hold current posture.", conf: 62, ...OR },
];

const DEBATE = [
  { glyph: "RSK", name: "Risk", stance: "REDUCE", line: '"Volatility regime shifted. The mandate requires trimming."', conf: 88, border: "rgba(111,191,143,.3)", ...GR },
  { glyph: "YLD", name: "Yield", stance: "REDUCE", line: '"Carry in reserves improved 60bps. The trade pays."', conf: 74, border: "rgba(111,191,143,.3)", ...GR },
  { glyph: "LIQ", name: "Liquidity", stance: "REDUCE", line: '"We can exit without moving the market. Window is open."', conf: 91, border: "rgba(111,191,143,.3)", ...GR },
  { glyph: "MAC", name: "Macro", stance: "HOLD", line: '"One print is not a regime. I dissent, for the record."', conf: 62, border: "rgba(214,146,106,.3)", ...OR },
];

const CIRCUIT = [
  { step: "I · CORE", name: "Treasury", desc: "Capital pools under a stated objective.", stat: "OBJECTIVE-BOUND", bg: "rgba(127,212,212,.05)", accent: "#7fd4d4", br: "1px solid rgba(236,235,230,.08)" },
  { step: "II", name: "Lending", desc: "Credit extended against reputation and terms.", stat: "RATE 7.4%", bg: "transparent", accent: "rgba(236,235,230,.6)", br: "1px solid rgba(236,235,230,.08)" },
  { step: "III", name: "Builders", desc: "Milestone-gated funding for ecosystem work.", stat: "3 ACTIVE", bg: "transparent", accent: "rgba(236,235,230,.6)", br: "1px solid rgba(236,235,230,.08)" },
  { step: "IV", name: "Predictions", desc: "Positions on questions the contract can resolve.", stat: "4 OPEN", bg: "transparent", accent: "rgba(236,235,230,.6)", br: "1px solid rgba(236,235,230,.08)" },
  { step: "V · RETURN", name: "Yield", desc: "Returns flow back to the core. The loop repeats.", stat: "+412 / DAY", bg: "rgba(111,191,143,.05)", accent: "#6fbf8f", br: "none" },
];

const EVENTS = [
  { tag: "LIQUIDITY CRUNCH", name: "Exit depth collapses", reaction: "Councils widen reserves, pause new lending, shorten prediction horizons.", stat: "LAST: 3 VAULTS REACTED IN 4 MIN", color: "#d6926a" },
  { tag: "CREDIT CRISIS", name: "Default cascade", reaction: "Lending lines tighten LTV; reputation weights recalibrate across the economy.", stat: "LAST: LTV −18% SYSTEM-WIDE", color: "#d6926a" },
  { tag: "AI BOOM", name: "Builder demand surge", reaction: "Growth-mandated vaults rotate into builder funding; milestones accelerate.", stat: "LAST: +9% TO BUILDERS", color: "#6fbf8f" },
  { tag: "BULL MARKET", name: "Risk appetite rises", reaction: "Councils debate expansion — conservative mandates hold, and say why.", stat: "LAST: 2 DISSENTS RECORDED", color: "#6fbf8f" },
];

const TIMELINE = [
  { label: "EVENT DETECTED · 14:02", text: "Benchmark rate moved beyond the vault’s tolerance band.", dot: "#d6926a", color: "#d6926a", line: true },
  { label: "COUNCIL CONVENED · 14:07", text: "Four analysts weighing the objective against exposure.", dot: "#7fd4d4", color: "#7fd4d4", line: true },
  { label: "CONSENSUS REACHED · 14:11", text: "3/4 in favor. Macro dissent noted and preserved.", dot: "#6fbf8f", color: "#6fbf8f", line: true },
  { label: "CAPITAL REALLOCATED · 14:14", text: "12% moved from growth sleeve into cash reserves.", dot: "#7fd4d4", color: "#7fd4d4", line: true },
  { label: "RECORDED ONCHAIN · 14:32 · TX 0x8F2…C41", text: "Decision № 4,182 written to GenLayer with full reasoning lineage.", dot: "#ecebe6", color: "rgba(236,235,230,.7)", line: false },
];

const VAULTS = [
  { name: "Meridian Income", rep: 94, objective: "Steady income, moderate risk, 12-month horizon.", yield: "+6.8%", decisions: "4,182", status: "Council deliberating — rate event, 3 min ago" },
  { name: "Frontier Growth", rep: 88, objective: "Compound aggressively; accept drawdowns to 15%.", yield: "+11.2%", decisions: "2,947", status: "Rebalanced 14 min ago — consensus 3/4" },
  { name: "Harbor Reserve", rep: 97, objective: "Preserve capital above all. Liquidity within a day.", yield: "+3.1%", decisions: "5,406", status: "Watching — no open deliberations" },
];

const TICKER = [
  { text: "◦ 14:02 RATE EVENT DETECTED" },
  { text: "◉ 14:07 MERIDIAN COUNCIL CONVENED", cyan: true },
  { text: "◦ 14:11 HARBOR CONSENSUS 6/7" },
  { text: "◦ 14:14 −12% GROWTH → RESERVES" },
  { text: "◦ 14:32 DECISION №4,182 RECORDED 0x8F2…C41" },
  { text: "◦ 14:40 PROPOSAL №77 UNDER REVIEW" },
];

function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <path d="M17 4 L21.5 17 L17 30 L12.5 17 Z" fill="#7fd4d4" />
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="rgba(236,235,230,.3)" strokeWidth="1.4" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      {/* ── NAV ── */}
      <nav
        style={{
          position: "sticky", top: 0, zIndex: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 40px",
          background: "rgba(7,10,18,.85)", backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(236,235,230,.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <Logo />
          <span style={{ font: `600 17px ${SANS}`, letterSpacing: ".01em" }}>COMPASS</span>
          <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)", borderLeft: "1px solid rgba(236,235,230,.15)", paddingLeft: 11 }}>
            AUTONOMOUS CAPITAL OS
          </span>
        </div>
        <div style={{ display: "flex", gap: 28, font: `400 13px ${SANS}` }}>
          <a className="ce-navlink" href="#engine">Capital Engine</a>
          <a className="ce-navlink" href="#council">Council</a>
          <a className="ce-navlink" href="#events">Events</a>
          <a className="ce-navlink" href="#record">Record</a>
          <a className="ce-navlink" href="#vaults">Vaults</a>
        </div>
        <Link href="/ecosystem">
          <button className="ce-btn-primary" style={{ font: `600 13px ${SANS}`, padding: "9px 20px", borderRadius: 6 }}>
            Enter
          </button>
        </Link>
      </nav>

      {/* ══ SECTION 1 · HERO: value prop | capital engine | council ══ */}
      <section id="engine" style={{ borderBottom: "1px solid rgba(236,235,230,.08)", background: "linear-gradient(180deg,#0b101d 0%,#070a12 100%)" }}>
        <div
          className="ce-hero-grid"
          style={{
            maxWidth: 1360, margin: "0 auto", padding: "64px 40px 56px",
            display: "grid", gridTemplateColumns: "minmax(240px,300px) minmax(420px,1fr) minmax(240px,300px)",
            gap: 36, alignItems: "stretch",
          }}
        >
          {/* LEFT: value prop */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, justifyContent: "center" }}>
            <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>
              SYSTEM LIVE · EPOCH 4,182
            </span>
            <h1 style={{ margin: 0, font: `300 44px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>
              An economy that <span style={{ font: `italic 300 44px ${SERIF}`, color: "#7fd4d4" }}>thinks</span> before it moves.
            </h1>
            <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
              State an objective. Compass reasons, allocates, adapts — and writes every decision onchain. Built on GenLayer.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/vaults/create" style={{ display: "contents" }}>
                <button className="ce-btn-primary" style={{ font: `600 14px ${SANS}`, padding: "13px 24px", borderRadius: 7 }}>
                  State an objective
                </button>
              </Link>
              <Link href="/ecosystem" style={{ display: "contents" }}>
                <button className="ce-btn-secondary" style={{ font: `500 14px ${SANS}`, padding: "13px 24px", borderRadius: 7 }}>
                  Observe the economy
                </button>
              </Link>
            </div>
          </div>

          {/* CENTER: CAPITAL ENGINE (Signature Asset 01 + 02) */}
          <div style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 12, background: "#0a0f1a", padding: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
              <span>CAPITAL ENGINE · MERIDIAN INCOME</span>
              <span style={{ color: "#7fd4d4", animation: "cePulse 2s infinite" }}>● LIVE</span>
            </div>
            <svg width="100%" viewBox="0 0 640 420" style={{ display: "block" }}>
              <defs>
                <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="#7fd4d4" />
                </marker>
                <marker id="arrDim" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="rgba(111,191,143,.8)" />
                </marker>
              </defs>
              {/* TREASURY BRAIN core */}
              <g>
                <rect x="30" y="120" width="180" height="180" rx="10" fill="#10182a" stroke="rgba(127,212,212,.45)" strokeWidth="1.4" />
                <rect x="30" y="120" width="180" height="180" rx="10" fill="none" stroke="rgba(127,212,212,.15)" strokeWidth="6" />
                <clipPath id="coreClip"><rect x="31" y="121" width="178" height="178" rx="9" /></clipPath>
                <g clipPath="url(#coreClip)">
                  <rect x="31" y="140" width="178" height="1.5" fill="rgba(127,212,212,.35)" style={{ animation: "ceScan 3.2s linear infinite alternate" }} />
                </g>
                <text x="120" y="145" textAnchor="middle" fill="rgba(236,235,230,.5)" style={{ font: `500 9px ${MONO}` }} letterSpacing="2">TREASURY BRAIN</text>
                <text x="120" y="172" textAnchor="middle" fill="#ecebe6" style={{ font: `italic 400 14.5px ${SERIF}` }}>&quot;Steady income,</text>
                <text x="120" y="190" textAnchor="middle" fill="#ecebe6" style={{ font: `italic 400 14.5px ${SERIF}` }}>moderate risk.&quot;</text>
                <line x1="46" y1="204" x2="194" y2="204" stroke="rgba(236,235,230,.1)" />
                <text x="46" y="224" fill="rgba(236,235,230,.45)" style={{ font: `400 8.5px ${MONO}` }}>RISK</text>
                <text x="194" y="224" textAnchor="end" fill="#6fbf8f" style={{ font: `500 9.5px ${MONO}` }}>MODERATE</text>
                <text x="46" y="242" fill="rgba(236,235,230,.45)" style={{ font: `400 8.5px ${MONO}` }}>YIELD 30D</text>
                <text x="194" y="242" textAnchor="end" fill="#6fbf8f" style={{ font: `500 9.5px ${MONO}` }}>+6.8%</text>
                <text x="46" y="260" fill="rgba(236,235,230,.45)" style={{ font: `400 8.5px ${MONO}` }}>CONFIDENCE</text>
                <text x="194" y="260" textAnchor="end" fill="#7fd4d4" style={{ font: `500 9.5px ${MONO}` }}>82%</text>
                <rect x="46" y="270" width="148" height="4" rx="2" fill="rgba(236,235,230,.08)" />
                <rect x="46" y="270" width="121" height="4" rx="2" fill="#7fd4d4" />
              </g>
              {/* destination nodes */}
              <g style={{ font: `400 9px ${MONO}` }}>
                <rect x="440" y="24" width="170" height="52" rx="7" fill="#10182a" stroke="rgba(236,235,230,.18)" />
                <text x="456" y="46" fill="#ecebe6" style={{ font: `500 11px ${SANS}` }}>LENDING</text>
                <text x="456" y="63" fill="rgba(236,235,230,.5)">20% · RATE 7.4%</text>
                <rect x="440" y="98" width="170" height="52" rx="7" fill="#10182a" stroke="rgba(236,235,230,.18)" />
                <text x="456" y="120" fill="#ecebe6" style={{ font: `500 11px ${SANS}` }}>BUILDER FUNDING</text>
                <text x="456" y="137" fill="rgba(236,235,230,.5)">8% · 3 MILESTONES</text>
                <rect x="440" y="172" width="170" height="52" rx="7" fill="#10182a" stroke="rgba(236,235,230,.18)" />
                <text x="456" y="194" fill="#ecebe6" style={{ font: `500 11px ${SANS}` }}>PREDICTIONS</text>
                <text x="456" y="211" fill="rgba(236,235,230,.5)">6% · 4 POSITIONS</text>
                <rect x="440" y="246" width="170" height="52" rx="7" fill="#10182a" stroke="rgba(127,212,212,.4)" />
                <text x="456" y="268" fill="#ecebe6" style={{ font: `500 11px ${SANS}` }}>CASH RESERVES</text>
                <text x="456" y="285" fill="#7fd4d4">46% ▲ REBALANCING</text>
                <rect x="440" y="320" width="170" height="52" rx="7" fill="#101d17" stroke="rgba(111,191,143,.4)" />
                <text x="456" y="342" fill="#6fbf8f" style={{ font: `500 11px ${SANS}` }}>YIELD RETURNS</text>
                <text x="456" y="359" fill="rgba(111,191,143,.7)">+412 / DAY → CORE</text>
              </g>
              {/* outbound flows (thickness = allocation) */}
              <path d="M210,150 C330,150 330,50 440,50" fill="none" stroke="rgba(127,212,212,.18)" strokeWidth="7" />
              <path d="M210,150 C330,150 330,50 440,50" fill="none" stroke="#7fd4d4" strokeWidth="1.6" strokeDasharray="4 12" markerEnd="url(#arr)" style={{ animation: "ceFlow 3.2s linear infinite" }} />
              <path d="M210,185 C330,185 330,124 440,124" fill="none" stroke="rgba(127,212,212,.12)" strokeWidth="4" />
              <path d="M210,185 C330,185 330,124 440,124" fill="none" stroke="rgba(127,212,212,.8)" strokeWidth="1.2" strokeDasharray="4 14" markerEnd="url(#arr)" style={{ animation: "ceFlow 4.4s linear infinite" }} />
              <path d="M210,220 C330,220 330,198 440,198" fill="none" stroke="rgba(127,212,212,.1)" strokeWidth="3" />
              <path d="M210,220 C330,220 330,198 440,198" fill="none" stroke="rgba(127,212,212,.6)" strokeWidth="1" strokeDasharray="3 15" markerEnd="url(#arr)" style={{ animation: "ceFlow 5.2s linear infinite" }} />
              <path d="M210,255 C330,255 330,272 440,272" fill="none" stroke="rgba(127,212,212,.28)" strokeWidth="11" />
              <path d="M210,255 C330,255 330,272 440,272" fill="none" stroke="#7fd4d4" strokeWidth="2" strokeDasharray="5 10" markerEnd="url(#arr)" style={{ animation: "ceFlow 2.4s linear infinite" }} />
              {/* return loop: yield back to core */}
              <path d="M440,346 C300,346 260,300 210,286 " fill="none" stroke="rgba(111,191,143,.15)" strokeWidth="5" />
              <path d="M440,346 C300,346 260,300 214,288" fill="none" stroke="#6fbf8f" strokeWidth="1.4" strokeDasharray="4 12" markerEnd="url(#arrDim)" style={{ animation: "ceFlow 3.8s linear infinite" }} />
              <text x="318" y="336" textAnchor="middle" fill="rgba(111,191,143,.65)" style={{ font: `400 8.5px ${MONO}` }}>YIELD RETURN LOOP</text>
              <text x="318" y="40" textAnchor="middle" fill="rgba(236,235,230,.35)" style={{ font: `400 8.5px ${MONO}` }}>ALLOCATION = LINE WEIGHT</text>
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)", borderTop: "1px solid rgba(236,235,230,.08)", paddingTop: 10 }}>
              <span>LAST REALLOCATION 14:14 UTC · −12% GROWTH → RESERVES</span>
              <span>TX 0x8F2…C41</span>
            </div>
          </div>

          {/* RIGHT: AI COUNCIL (Signature Asset 03) */}
          <div style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 12, background: "#0a0f1a", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>
              <span>AI COUNCIL · DELIBERATING</span>
              <span style={{ display: "flex", gap: 4 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7fd4d4", animation: "ceTick 1.8s infinite" }} />
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7fd4d4", animation: "ceTick 1.8s .3s infinite" }} />
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7fd4d4", animation: "ceTick 1.8s .6s infinite" }} />
              </span>
            </div>
            {COUNCIL.map((c) => (
              <div key={c.glyph} style={{ border: "1px solid rgba(236,235,230,.08)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 7, animation: "ceRise .5s ease-out both" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, display: "grid", placeItems: "center", background: c.bg, color: c.fg, font: `500 8px ${MONO}` }}>{c.glyph}</span>
                  <span style={{ font: `500 11px ${SANS}`, color: "rgba(236,235,230,.85)" }}>{c.name}</span>
                  <span style={{ marginLeft: "auto", font: `500 9px ${MONO}`, color: c.fg }}>{c.stance}</span>
                </div>
                <div style={{ font: `400 11.5px/1.5 ${SANS}`, color: "rgba(236,235,230,.6)" }}>{c.line}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(236,235,230,.08)", overflow: "hidden" }}>
                    <div style={{ width: `${c.conf}%`, height: "100%", background: c.fg, borderRadius: 2 }} />
                  </div>
                  <span style={{ font: `400 9px ${MONO}`, color: "rgba(236,235,230,.5)" }}>{c.conf}%</span>
                </div>
              </div>
            ))}
            <div style={{ marginTop: "auto", border: "1px solid rgba(127,212,212,.35)", borderRadius: 8, padding: 12, background: "rgba(127,212,212,.06)" }}>
              <div style={{ font: `500 9px ${MONO}`, color: "#7fd4d4", letterSpacing: ".15em" }}>CONSENSUS FORMING · 3/4</div>
              <div style={{ font: `500 12.5px ${SANS}`, marginTop: 5 }}>Increase reserve allocation +12%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULSE TICKER ── */}
      <div style={{ borderBottom: "1px solid rgba(236,235,230,.08)", padding: "11px 0", overflow: "hidden", background: "rgba(15,22,38,.6)" }}>
        <div style={{ display: "inline-flex", gap: 44, whiteSpace: "nowrap", font: `400 11px ${MONO}`, color: "rgba(236,235,230,.55)", animation: "ceDrift 22s linear infinite" }}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} style={t.cyan ? { color: "#7fd4d4" } : undefined}>{t.text}</span>
          ))}
        </div>
      </div>

      {/* ══ SECTION 2 · HOW CAPITAL MOVES ══ */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>02 · HOW CAPITAL MOVES</span>
          <h2 style={{ margin: 0, font: `300 36px/1.15 ${SANS}`, letterSpacing: "-.01em" }}>One continuous circuit. No idle capital.</h2>
          <p style={{ margin: 0, font: `400 14.5px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Treasury deploys into lending, builders, and predictions. Returns flow back to the core, where the council decides the next move. The loop never stops.
          </p>
        </div>
        <div className="ce-5col" style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 0, border: "1px solid rgba(236,235,230,.1)", borderRadius: 12, overflow: "hidden" }}>
          {CIRCUIT.map((s) => (
            <div key={s.step} style={{ padding: "24px 22px", borderRight: s.br, display: "flex", flexDirection: "column", gap: 10, background: s.bg }}>
              <span style={{ font: `500 9.5px ${MONO}`, color: s.accent, letterSpacing: ".15em" }}>{s.step}</span>
              <span style={{ font: `500 15px ${SANS}` }}>{s.name}</span>
              <span style={{ font: `400 12.5px/1.55 ${SANS}`, color: "rgba(236,235,230,.55)" }}>{s.desc}</span>
              <span style={{ font: `400 10px ${MONO}`, color: s.accent }}>{s.stat}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SECTION 3 · AI COUNCIL ══ */}
      <section id="council" style={{ borderTop: "1px solid rgba(236,235,230,.08)", background: "linear-gradient(180deg,rgba(15,22,38,.5) 0%,transparent 100%)" }}>
        <div className="ce-2col" style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 40px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 56, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>03 · THE COUNCIL</span>
            <h2 style={{ margin: 0, font: `300 36px/1.15 ${SANS}`, letterSpacing: "-.01em" }}>Four mandates. One decision. Dissent preserved.</h2>
            <p style={{ margin: 0, font: `400 14.5px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
              Risk, Yield, Liquidity, and Macro analysts deliberate on GenLayer. Each argues its mandate with a stated confidence. Consensus is earned — and when an agent disagrees, the disagreement is written into the record alongside the decision.
            </p>
            <div style={{ display: "flex", gap: 20, font: `400 10.5px ${MONO}`, color: "rgba(236,235,230,.5)" }}>
              <span><span style={{ color: "#7fd4d4" }}>◉</span> DELIBERATION</span>
              <span><span style={{ color: "#6fbf8f" }}>◉</span> AGREEMENT</span>
              <span><span style={{ color: "#d6926a" }}>◉</span> DISSENT</span>
            </div>
          </div>
          <div style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 12, background: "#0a0f1a", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>QUESTION BEFORE THE COUNCIL</div>
            <div style={{ font: `italic 400 19px/1.4 ${SERIF}` }}>&quot;Should the vault reduce growth exposure after the rate event?&quot;</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {DEBATE.map((d) => (
                <div key={d.glyph} style={{ border: `1px solid ${d.border}`, borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 5, display: "grid", placeItems: "center", background: d.bg, color: d.fg, font: `500 8px ${MONO}` }}>{d.glyph}</span>
                    <span style={{ font: `500 12px ${SANS}` }}>{d.name}</span>
                    <span style={{ marginLeft: "auto", font: `500 9px ${MONO}`, color: d.fg }}>{d.stance}</span>
                  </div>
                  <div style={{ font: `400 12px/1.5 ${SANS}`, color: "rgba(236,235,230,.65)" }}>{d.line}</div>
                  <div style={{ font: `400 9.5px ${MONO}`, color: "rgba(236,235,230,.45)" }}>CONFIDENCE {d.conf}%</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop: "1px solid rgba(236,235,230,.1)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".15em" }}>CONSENSUS 3/4 · REDUCE GROWTH −12%</span>
              <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)" }}>DISSENT: MACRO · RECORDED</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 4 · ECONOMIC EVENTS ══ */}
      <section id="events" style={{ borderTop: "1px solid rgba(236,235,230,.08)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 40px", display: "flex", flexDirection: "column", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 620 }}>
            <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>04 · ECONOMIC EVENTS</span>
            <h2 style={{ margin: 0, font: `300 36px/1.15 ${SANS}`, letterSpacing: "-.01em" }}>The world changes. Vaults answer.</h2>
          </div>
          <div className="ce-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {EVENTS.map((e) => (
              <div key={e.tag} className="ce-card-hover" style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 10, padding: 20, background: "#0a0f1a", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={{ font: `500 9.5px ${MONO}`, color: e.color, letterSpacing: ".15em" }}>{e.tag}</span>
                <span style={{ font: `500 15px ${SANS}` }}>{e.name}</span>
                <span style={{ font: `400 12px/1.55 ${SANS}`, color: "rgba(236,235,230,.55)" }}>{e.reaction}</span>
                <span style={{ font: `400 9.5px ${MONO}`, color: "rgba(236,235,230,.4)", marginTop: "auto" }}>{e.stat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 5 · DECISION HISTORY ══ */}
      <section id="record" style={{ borderTop: "1px solid rgba(236,235,230,.08)", background: "linear-gradient(180deg,rgba(15,22,38,.5) 0%,transparent 100%)" }}>
        <div className="ce-2col" style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 40px", display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 56, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 100 }}>
            <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>05 · THE RECORD</span>
            <h2 style={{ margin: 0, font: `300 36px/1.15 ${SANS}`, letterSpacing: "-.01em" }}>Onchain memory, not an activity log.</h2>
            <p style={{ margin: 0, font: `400 14.5px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
              Every decision carries its full lineage: the event that triggered it, the arguments made, the vote, the dissent, the transaction. Permanent, on GenLayer.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {TIMELINE.map((t) => (
              <div key={t.label} style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ flex: "none", width: 10, height: 10, borderRadius: "50%", background: t.dot, marginTop: 4 }} />
                  {t.line && <span style={{ flex: 1, width: 1, background: "rgba(236,235,230,.12)" }} />}
                </div>
                <div style={{ paddingBottom: 26, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ font: `500 9.5px ${MONO}`, color: t.color, letterSpacing: ".15em" }}>{t.label}</span>
                  <span style={{ font: `400 15px/1.5 ${SANS}`, color: "rgba(236,235,230,.85)" }}>{t.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SECTION 6 · VAULT MARKETPLACE ══ */}
      <section id="vaults" style={{ borderTop: "1px solid rgba(236,235,230,.08)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 40px", display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>06 · VAULTS</span>
              <h2 style={{ margin: 0, font: `300 36px/1.15 ${SANS}`, letterSpacing: "-.01em" }}>Choose an objective, not a spreadsheet.</h2>
            </div>
            <Link href="/vaults" style={{ font: `500 13.5px ${SANS}` }}>Browse the marketplace →</Link>
          </div>
          <div className="ce-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {VAULTS.map((v) => (
              <Link key={v.name} href="/vaults" style={{ display: "contents", color: "inherit" }}>
                <div className="ce-card-hover" style={{ border: "1px solid rgba(236,235,230,.1)", borderRadius: 10, padding: 24, background: "#0a0f1a", display: "flex", flexDirection: "column", gap: 14, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ font: `500 17px ${SANS}` }}>{v.name}</span>
                    <span style={{ font: `500 9.5px ${MONO}`, color: "#7fd4d4", border: "1px solid rgba(127,212,212,.35)", borderRadius: 4, padding: "3px 8px" }}>REP {v.rep}</span>
                  </div>
                  <div style={{ font: `italic 400 13.5px/1.5 ${SERIF}`, color: "rgba(236,235,230,.6)" }}>&quot;{v.objective}&quot;</div>
                  <div style={{ display: "flex", gap: 20, marginTop: "auto", font: `500 13px ${MONO}` }}>
                    <span style={{ color: "#6fbf8f" }}>{v.yield}</span>
                    <span style={{ color: "rgba(236,235,230,.6)" }}>{v.decisions} DECISIONS</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, font: `400 10px ${MONO}`, color: "rgba(236,235,230,.5)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7fd4d4", animation: "cePulse 1.6s infinite" }} />
                    {v.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ borderTop: "1px solid rgba(236,235,230,.08)", background: "radial-gradient(100% 140% at 50% 130%,#131d31 0%,#070a12 60%)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "110px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <Logo size={36} />
          <h2 style={{ margin: 0, font: `300 42px/1.15 ${SANS}`, letterSpacing: "-.015em" }}>
            The economy is already thinking.<br />
            <span style={{ font: `italic 300 42px ${SERIF}`, color: "#7fd4d4" }}>Give it something to think about.</span>
          </h2>
          <Link href="/vaults/create">
            <button className="ce-btn-primary" style={{ font: `600 15px ${SANS}`, padding: "15px 32px", borderRadius: 8 }}>
              State an objective
            </button>
          </Link>
          <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)", letterSpacing: ".2em" }}>
            BUILT ON GENLAYER · EVERY DECISION ONCHAIN
          </span>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(236,235,230,.08)", padding: "26px 40px", display: "flex", justifyContent: "space-between", font: `400 10.5px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
        <span>COMPASS · THE OPERATING SYSTEM FOR AUTONOMOUS CAPITAL</span>
        <div style={{ display: "flex", gap: 22 }}>
          <a href="#" style={{ color: "rgba(236,235,230,.5)" }}>Docs</a>
          <a href="#" style={{ color: "rgba(236,235,230,.5)" }}>Governance</a>
          <a href="#record" style={{ color: "rgba(236,235,230,.5)" }}>The record</a>
        </div>
      </footer>
    </main>
  );
}
