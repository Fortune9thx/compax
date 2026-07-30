/* ─── DecisionRecord ────────────────────────────────────────────────────
   The portfolio manager's work, shown as evidence.

   Each rebalance is an intelligent-contract decision: it fetched live market
   data, reasoned over it, and moved capital. The contract stores the raw
   payloads it read. Showing them is what separates a functioning autonomous
   manager from a demo that claims to be one.
──────────────────────────────────────────────────────────────────────── */
"use client";

import { useState } from "react";
import type { RebalanceRecord } from "@/hooks/useContract";

const SECTORS: [keyof RebalanceRecord, keyof RebalanceRecord, string][] = [
  ["old_lending", "new_lending", "Lending"],
  ["old_staking", "new_staking", "Staking"],
  ["old_builders", "new_builders", "Builders"],
  ["old_predictions", "new_predictions", "Predictions"],
];

/** Pull the headline figures out of a raw CoinGecko / Fear&Greed payload. */
function readMarket(raw: string): string[] {
  if (!raw) return [];
  const out: string[] = [];
  try {
    const j = JSON.parse(raw);
    for (const [id, v] of Object.entries(j as Record<string, Record<string, number>>)) {
      if (v && typeof v === "object" && "usd" in v) {
        const chg = Object.entries(v).find(([k]) => k.includes("24h"))?.[1];
        out.push(
          `${id} $${Number(v.usd).toLocaleString()}${
            typeof chg === "number" ? ` ${chg >= 0 ? "+" : ""}${chg.toFixed(2)}%` : ""
          }`,
        );
      }
    }
    if (j?.data?.[0]?.value) out.push(`fear & greed ${j.data[0].value} · ${j.data[0].value_classification}`);
  } catch {
    /* not JSON — fall through to raw */
  }
  return out;
}

export function DecisionRecord({ record, index }: { record: RebalanceRecord; index: number }) {
  const [open, setOpen] = useState(false);
  const autonomous = record.triggered_by === "keeper";
  const market = [...readMarket(record.market_snapshot), ...readMarket(record.sentiment_snapshot)];

  const moves = SECTORS.map(([o, n, label]) => {
    const from = Number(record[o]);
    const to = Number(record[n]);
    return { label, from, to, delta: to - from };
  }).filter((m) => m.delta !== 0);

  return (
    <div className="cx-decision">
      <button className="cx-decision-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="cx-decision-n">#{index + 1}</span>
        <span className={`cx-decision-src ${autonomous ? "is-auto" : ""}`}>
          {autonomous ? "Autonomous cycle" : "Manual"}
        </span>
        <span className="cx-decision-moves">
          {moves.length === 0 ? (
            <span className="cx-move-hold">Held allocation</span>
          ) : (
            moves.map((m) => (
              <span key={m.label} className="cx-move">
                {m.label}
                <b className={m.delta > 0 ? "up" : "down"}>
                  {m.delta > 0 ? "+" : ""}
                  {m.delta}
                </b>
              </span>
            ))
          )}
        </span>
        <span className="cx-decision-caret">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="cx-decision-body">
          <div className="cx-evidence-block">
            <span className="cx-label">Reasoning</span>
            <p className="cx-reason">{record.reason || "—"}</p>
          </div>

          {market.length > 0 && (
            <div className="cx-evidence-block">
              <span className="cx-label">Live data it read</span>
              <div className="cx-evidence-chips">
                {market.map((m, i) => (
                  <span key={i} className="cx-evidence-chip">{m}</span>
                ))}
              </div>
            </div>
          )}

          {record.event_context && record.event_context !== "No active economic event." && (
            <div className="cx-evidence-block">
              <span className="cx-label">Event context</span>
              <p className="cx-reason">{record.event_context}</p>
            </div>
          )}

          <div className="cx-evidence-block">
            <span className="cx-label">Allocation</span>
            <div className="cx-shift">
              {SECTORS.map(([o, n, label]) => (
                <div key={label} className="cx-shift-row">
                  <span>{label}</span>
                  <span className="cx-mono">
                    {String(record[o])}% → <b>{String(record[n])}%</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
