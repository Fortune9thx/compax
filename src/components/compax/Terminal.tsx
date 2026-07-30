/* ─── The Compax Terminal ────────────────────────────────────────────────
   The hero object is the product itself — a single elevated surface holding
   the real interface, reading live from Bradbury. Not a sculpture, not a
   screenshot. Inner panels stagger-rise on entrance.
──────────────────────────────────────────────────────────────────────── */
"use client";

import { ConsensusGlyph } from "./Engine";
import { RevealGroup, RevealItem } from "./Reveal";
import {
  useTotalTVL,
  useVaultCount,
  useTotalStaked,
  useTotalBorrowed,
  useTotalVolume,
  useAllVaults,
  useAllEvents,
} from "@/hooks/useContract";

const SECTORS = [
  { key: "lending", label: "Lending" },
  { key: "staking", label: "Staking" },
  { key: "builders", label: "Builders" },
  { key: "predictions", label: "Predictions" },
] as const;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

export function Terminal() {
  const { data: tvl } = useTotalTVL();
  const { data: vaultCount } = useVaultCount();
  const { data: staked } = useTotalStaked();
  const { data: borrowed } = useTotalBorrowed();
  const { data: volume } = useTotalVolume();
  const { data: vaults } = useAllVaults();
  const { data: events } = useAllEvents();

  const agg = vaults.reduce(
    (a, v) => {
      const w = v.treasury || 1;
      a.lending += v.allocation_lending * w;
      a.staking += v.allocation_staking * w;
      a.builders += v.allocation_builders * w;
      a.predictions += v.allocation_predictions * w;
      return a;
    },
    { lending: 0, staking: 0, builders: 0, predictions: 0 } as Record<string, number>,
  );
  const total = Object.values(agg).reduce((a, b) => a + b, 0);
  const pct = (k: string) => (total > 0 ? Math.round((agg[k] / total) * 100) : 25);

  const active = events.filter((e) => e.is_active);
  const recent = [...events].reverse().slice(0, 3);

  return (
    <div className="cx-term-wrap">
      <div className="cx-term-halo" aria-hidden="true" />
      <div className="cx-term">
        {/* chrome */}
        <div className="cx-term-chrome">
          <span className="cx-term-name">Compax</span>
          <span className="cx-term-chip">Bradbury · chainId 4221</span>
          <span className="cx-term-live">
            <i className="cx-dot" />
            Live
          </span>
        </div>

        <RevealGroup className="cx-term-body" stagger={0.07}>
          {/* allocation */}
          <RevealItem className="cx-card cx-card-lg">
            <div className="cx-card-head">
              <span className="cx-label">Network allocation</span>
              <span className="cx-label">{vaultCount} vaults</span>
            </div>
            <div className="cx-tvl">
              <span className="cx-tvl-n">{fmt(tvl)}</span>
              <span className="cx-tvl-u">cGEN total value locked</span>
            </div>
            <div className="cx-alloc">
              {SECTORS.map((s) => (
                <div key={s.key} className="cx-alloc-row">
                  <span className="cx-alloc-label">{s.label}</span>
                  <span className="cx-track">
                    <span className="cx-fill" style={{ width: `${pct(s.key)}%` }} />
                  </span>
                  <span className="cx-alloc-pct">{pct(s.key)}%</span>
                </div>
              ))}
            </div>
          </RevealItem>

          {/* consensus */}
          <RevealItem className="cx-card">
            <span className="cx-label">Consensus model</span>
            <div className="cx-consensus">
              <ConsensusGlyph votes={[null, null, null, null, null]} size={9} gap={6} />
              <span className="cx-consensus-n">5 validators</span>
            </div>
            <p className="cx-note">
              Every decision is evaluated independently by five GenLayer validators
              before it is written onchain.
            </p>
          </RevealItem>

          {/* events */}
          <RevealItem className="cx-card">
            <div className="cx-card-head">
              <span className="cx-label">Economic events</span>
              <span className="cx-label">{active.length} active</span>
            </div>
            {recent.length === 0 ? (
              <p className="cx-note">No events recorded yet.</p>
            ) : (
              <ul className="cx-events">
                {recent.map((e) => (
                  <li key={e.id}>
                    <i className={e.is_active ? "cx-dot cx-dot-amber" : "cx-dot cx-dot-off"} />
                    <span className="cx-event-name">{e.name}</span>
                    <span className="cx-event-sev">sev {e.severity}</span>
                  </li>
                ))}
              </ul>
            )}
          </RevealItem>

          {/* stat strip */}
          <RevealItem className="cx-strip">
            {[
              { l: "Staked", v: fmt(staked) },
              { l: "Lent", v: fmt(borrowed) },
              { l: "Predicted", v: fmt(volume) },
              { l: "Contracts", v: "7" },
            ].map((s) => (
              <div key={s.l} className="cx-stat">
                <span className="cx-label">{s.l}</span>
                <span className="cx-stat-v">{s.v}</span>
              </div>
            ))}
          </RevealItem>
        </RevealGroup>
      </div>
    </div>
  );
}
