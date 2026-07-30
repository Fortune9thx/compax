/* ─── Readout primitives ────────────────────────────────────────────────
   Allocation and consensus, at glyph scale. These two survived the hero
   redesign because they do a job no panel can: fit inside a table row and
   inside a sentence.

   The hero object is no longer an abstract instrument — it is the product
   itself. See Terminal.tsx. Allocation at panel scale is Allocation.tsx.
──────────────────────────────────────────────────────────────────────── */
"use client";

/** Vote per validator: true = AGREE, false = DISAGREE, null = pending. */
export type Vote = boolean | null;

/** The four real sectors (VaultManager.allocation_*). */
export interface Allocation {
  staking: number;
  lending: number;
  builders: number;
  predictions: number;
}

const ORDER: (keyof Allocation)[] = ["lending", "staking", "builders", "predictions"];

function voteColor(v: Vote): string {
  if (v === null || v === undefined) return "var(--faint)";
  return v ? "var(--primary)" : "var(--clay)";
}

/* ─── Fingerprint — allocation as a 44×14 glyph, for table rows ─── */
export function EngineFingerprint({
  allocation,
  width = 44,
  height = 14,
  title,
}: {
  allocation: Allocation;
  width?: number;
  height?: number;
  title?: string;
}) {
  const vals = ORDER.map((k) => allocation[k] || 0);
  const max = Math.max(1, ...vals);
  const gap = height * 0.16;
  const lh = (height - gap * 3) / 4;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title ?? "Allocation readout"}
    >
      {vals.map((v, i) => (
        <rect
          key={i}
          x={0}
          y={i * (lh + gap)}
          width={Math.max(2, (v / max) * width)}
          height={lh}
          rx={0.5}
          fill="var(--primary)"
          opacity={0.45 + (v / max) * 0.55}
        />
      ))}
    </svg>
  );
}

/* ─── Consensus glyph — five inline validator vote marks ─── */
export function ConsensusGlyph({
  votes,
  size = 5,
  gap = 3,
}: {
  votes: [Vote, Vote, Vote, Vote, Vote];
  size?: number;
  gap?: number;
}) {
  return (
    <span
      style={{ display: "inline-flex", gap, alignItems: "center", verticalAlign: "middle" }}
      role="img"
      aria-label="Validator consensus"
    >
      {votes.map((v, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: voteColor(v),
            opacity: v === null || v === undefined ? 0.4 : 1,
          }}
        />
      ))}
    </span>
  );
}
