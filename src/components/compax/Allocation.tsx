/* ─── AllocationPanel ───────────────────────────────────────────────────
   The replacement for the retired hero object. Allocation reads as data,
   in the same language as the Terminal: labelled rows, animated tracks,
   mono figures. Used on every page that shows where capital sits.
──────────────────────────────────────────────────────────────────────── */
"use client";

import type { ReactNode } from "react";
import { ConsensusGlyph, type Allocation, type Vote } from "./Engine";

const ORDER: (keyof Allocation)[] = ["lending", "staking", "builders", "predictions"];
const DEFAULT_LABELS: Record<keyof Allocation, string> = {
  lending: "Lending",
  staking: "Staking",
  builders: "Builders",
  predictions: "Predictions",
};

export function AllocationPanel({
  allocation,
  labels,
  label = "Allocation",
  headline,
  unit,
  votes,
  footnote,
  normalize = false,
  degraded = false,
}: {
  allocation: Allocation;
  labels?: Partial<Record<keyof Allocation, string>>;
  label?: string;
  /** Big figure above the rows (e.g. treasury total). */
  headline?: ReactNode;
  unit?: string;
  votes?: [Vote, Vote, Vote, Vote, Vote];
  footnote?: ReactNode;
  /** Convert raw weights into percentages that sum to 100. */
  normalize?: boolean;
  degraded?: boolean;
}) {
  const total = ORDER.reduce((s, k) => s + (allocation[k] || 0), 0);
  const value = (k: keyof Allocation) => {
    const v = allocation[k] || 0;
    if (!normalize) return v;
    return total > 0 ? Math.round((v / total) * 100) : 0;
  };
  const max = Math.max(1, ...ORDER.map((k) => value(k)));

  return (
    <div className="cx-card">
      <div className="cx-card-head">
        <span className="cx-label">{label}</span>
        {votes && <ConsensusGlyph votes={votes} size={6} gap={4} />}
      </div>

      {headline !== undefined && (
        <div className="cx-tvl">
          <span className="cx-tvl-n">{headline}</span>
          {unit && <span className="cx-tvl-u">{unit}</span>}
        </div>
      )}

      <div className="cx-alloc" style={headline === undefined ? { marginTop: 18 } : undefined}>
        {ORDER.map((k) => {
          const v = value(k);
          return (
            <div key={k} className="cx-alloc-row">
              <span className="cx-alloc-label">{labels?.[k] ?? DEFAULT_LABELS[k]}</span>
              <span className="cx-track">
                <span
                  className="cx-fill"
                  style={{
                    width: `${(v / max) * 100}%`,
                    background: degraded ? "var(--faint)" : undefined,
                  }}
                />
              </span>
              <span className="cx-alloc-pct" style={degraded ? { color: "var(--faint)" } : undefined}>
                {v}
                {normalize ? "%" : ""}
              </span>
            </div>
          );
        })}
      </div>

      {footnote && <p className="cx-note" style={{ marginTop: 16 }}>{footnote}</p>}
    </div>
  );
}
