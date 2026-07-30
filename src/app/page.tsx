import Link from "next/link";
import { Terminal } from "@/components/compax/Terminal";
import { Reveal, RevealGroup, RevealItem } from "@/components/compax/Reveal";
import { ConsensusGlyph } from "@/components/compax/Engine";
import { EngineMark } from "@/components/compax/AppShell";

/* ─── Landing ────────────────────────────────────────────────────────────
   Architecture follows the reference: a centred editorial headline, pill
   CTAs with radial edge-glow, then the product itself as one large elevated
   surface. Sections rise on scroll under a single motion grammar.
──────────────────────────────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    t: "State an objective",
    d: "Write the mandate in a sentence — target, risk ceiling, horizon, constraints. No allocation tables.",
  },
  {
    n: "02",
    t: "Validators deliberate",
    d: "An intelligent contract reasons over live market context. Five validators independently vote on the result.",
  },
  {
    n: "03",
    t: "Capital moves, onchain",
    d: "The allocation is written with its full reasoning. Dissent is preserved. The loop repeats on every event.",
  },
];

const SECTORS = [
  { t: "Lending", d: "Credit priced against reputation and reasoned terms." },
  { t: "Staking", d: "The reserve — yield bands set from live conditions." },
  { t: "Builders", d: "Milestone-gated funding for ecosystem work." },
  { t: "Predictions", d: "Questions an intelligent contract can resolve." },
];

export default function LandingPage() {
  return (
    <main className="cx-page">
      <nav className="cx-nav">
        <Link href="/" className="cx-brand">
          <EngineMark size={20} />
          <span>Compax</span>
        </Link>
        <div className="cx-nav-links">
          <a href="#how">How it works</a>
          <a href="#council">Council</a>
          <a href="#sectors">Sectors</a>
        </div>
        <Link href="/ecosystem" className="cx-pill cx-pill-main cx-pill-sm">
          Open terminal
        </Link>
      </nav>

      {/* ── hero ── */}
      <section className="cx-hero">
        <Reveal y={16}>
          <span className="cx-eyebrow-pill">
            <i className="cx-dot" />
            7 intelligent contracts live on GenLayer Bradbury
          </span>
        </Reveal>

        <Reveal delay={0.08}>
          <h1 className="cx-display">
            Capital that reasons
            <br />
            before it moves
          </h1>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="cx-sub">
            Compax is an autonomous treasury. State an objective and intelligent
            contracts allocate across lending, staking, builders and predictions —
            every decision evaluated by five validators and written onchain.
          </p>
        </Reveal>

        <Reveal delay={0.24} className="cx-cta">
          <Link href="#how" className="cx-pill">
            See how it works
          </Link>
          <Link href="/vaults/create" className="cx-pill cx-pill-main">
            State an objective
          </Link>
        </Reveal>

        <Reveal delay={0.3} y={40} className="cx-term-mount">
          <Terminal />
        </Reveal>
      </section>

      {/* ── how it works ── */}
      <section id="how" className="cx-section">
        <Reveal>
          <p className="cx-kicker">How it works</p>
          <h2 className="cx-h2">From a sentence to a signed decision</h2>
        </Reveal>
        <RevealGroup className="cx-steps">
          {STEPS.map((s) => (
            <RevealItem key={s.n} className="cx-step">
              <span className="cx-step-n">{s.n}</span>
              <h3 className="cx-step-t">{s.t}</h3>
              <p className="cx-step-d">{s.d}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── council ── */}
      <section id="council" className="cx-section cx-section-alt">
        <div className="cx-split">
          <Reveal>
            <p className="cx-kicker">The council</p>
            <h2 className="cx-h2">Five validators. One decision. Dissent kept.</h2>
            <p className="cx-body">
              Every Compax transaction is evaluated independently by five GenLayer
              validators. Consensus is earned before any state is written, and the
              reasoning behind that consensus is permanent onchain.
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="cx-card cx-vote-card">
              <span className="cx-label">How deliberation resolves</span>
              {[
                { v: [true, true, true, true, true], l: "Accepted", n: "consensus" },
                { v: [null, null, null, null, null], l: "Deliberating", n: "in flight" },
              ].map((r) => (
                <div key={r.l} className="cx-vote-row">
                  <ConsensusGlyph votes={r.v as [boolean | null, boolean | null, boolean | null, boolean | null, boolean | null]} size={8} gap={5} />
                  <span className="cx-vote-l">{r.l}</span>
                  <span className="cx-vote-n">{r.n}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── sectors ── */}
      <section id="sectors" className="cx-section">
        <Reveal>
          <p className="cx-kicker">Four sectors</p>
          <h2 className="cx-h2">One treasury, continuously redirected</h2>
        </Reveal>
        <RevealGroup className="cx-sectors">
          {SECTORS.map((s) => (
            <RevealItem key={s.t} className="cx-card">
              <h3 className="cx-step-t">{s.t}</h3>
              <p className="cx-step-d">{s.d}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ── cta ── */}
      <section className="cx-close">
        <Reveal>
          <h2 className="cx-display cx-display-sm">
            The economy is already thinking
          </h2>
          <p className="cx-sub">Give it something to think about.</p>
          <div className="cx-cta">
            <Link href="/vaults/create" className="cx-pill cx-pill-main">
              State an objective
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="cx-foot">
        <span>Compax — autonomous treasury infrastructure</span>
        <div>
          <Link href="/ecosystem">Ecosystem</Link>
          <Link href="/vaults">Vaults</Link>
          <Link href="/reputation">Reputation</Link>
        </div>
      </footer>
    </main>
  );
}
