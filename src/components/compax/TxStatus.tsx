/* ─── TxStatus — the deliberation surface ────────────────────────────────
   A transaction on Compax is not "pending" — it is being deliberated by five
   GenLayer validators. This surfaces that: the five validator marks light up
   as votes land, then resolve to AGREE (accepted) or a contested/failed state.

   Phases:
     · deliberating — submitted, validators voting (ConsensusGlyph animates)
     · accepted     — consensus AGREE, state written onchain
     · failed       — rejected / errored

   Pair with useTxStatus() to drive it from a write call.
──────────────────────────────────────────────────────────────────────── */
"use client";

import { useCallback, useState } from "react";
import { ConsensusGlyph } from "./Engine";

export type TxPhase = "idle" | "deliberating" | "accepted" | "failed";

export interface TxState {
  phase: TxPhase;
  hash?: string;
  error?: string;
}

/** Drives a write through the deliberation lifecycle. */
export function useTxStatus() {
  const [tx, setTx] = useState<TxState>({ phase: "idle" });

  const run = useCallback(
    async (submit: () => Promise<Record<string, unknown> | string | void>) => {
      setTx({ phase: "deliberating" });
      try {
        const res = await submit();
        const hash =
          typeof res === "string"
            ? res
            : res && typeof res === "object"
              ? ((res.txHash ?? res.hash ?? res.txId) as string | undefined)
              : undefined;
        setTx({ phase: "accepted", hash });
        return { ok: true as const, hash };
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        setTx({ phase: "failed", error });
        return { ok: false as const, error };
      }
    },
    [],
  );

  const reset = useCallback(() => setTx({ phase: "idle" }), []);

  return { tx, run, reset };
}

const LABELS: Record<TxPhase, string> = {
  idle: "",
  deliberating: "Validators deliberating",
  accepted: "Consensus reached · AGREE",
  failed: "Consensus not reached",
};

/** Inline deliberation readout. Renders nothing when idle. */
export function TxStatus({ tx, onDismiss }: { tx: TxState; onDismiss?: () => void }) {
  if (tx.phase === "idle") return null;

  // Consensus glyph reflects what we actually know: ACCEPTED means the five
  // validators reached agreement (real chain state). A failed/errored tx
  // carries no per-validator vote breakdown, so it stays unresolved rather
  // than showing a fabricated split.
  const votes =
    tx.phase === "accepted"
      ? ([true, true, true, true, true] as const)
      : ([null, null, null, null, null] as const);

  return (
    <div className={`ce-txstatus ce-tx-${tx.phase}`} role="status" aria-live="polite">
      <ConsensusGlyph votes={[...votes] as [boolean | null, boolean | null, boolean | null, boolean | null, boolean | null]} size={7} />
      <div className="ce-tx-body">
        <div className="ce-tx-label">{LABELS[tx.phase]}</div>
        {tx.hash && (
          <div className="ce-tx-hash">
            {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
          </div>
        )}
        {tx.error && <div className="ce-tx-error">{tx.error}</div>}
      </div>
      {(tx.phase === "accepted" || tx.phase === "failed") && onDismiss && (
        <button className="ce-tx-dismiss" onClick={onDismiss} aria-label="Dismiss">
          ✕
        </button>
      )}
    </div>
  );
}
