"use client";

import { useState } from "react";
import { SANS, MONO, SERIF, GR, OR, AppNav, PulseTicker, panel, monoLabel, ThinkingDots } from "@/components/compass/ui";
import { useAllLoans, useTotalBorrowed, useContractWrite, LoanData } from "@/hooks/useContract";

const AMOUNTS = ["25000", "50000", "120000"];
const AMOUNT_LABELS = ["25,000", "50,000", "120,000"];
const TERMS = ["30", "90", "180"];
const TERM_LABELS = ["30 days", "90 days", "180 days"];
const COLLATERAL = ["reputation only", "10% reserve bond", "milestone escrow"];

function Slot({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <span
      onClick={() => onChange(options[(options.indexOf(value) + 1) % options.length])}
      title="Click to change"
      style={{ borderBottom: "1px solid #7fd4d4", color: "#7fd4d4", padding: "0 6px", cursor: "pointer", userSelect: "none" }}
    >
      {value}
    </span>
  );
}

function loanToRow(l: LoanData, i: number) {
  const addr = l.borrower.length > 10 ? `${l.borrower.slice(0, 5)}…${l.borrower.slice(-3)}` : l.borrower;
  return {
    no: String(200 + i),
    borrower: addr,
    terms: `${l.amount.toLocaleString()} · ${l.duration_days}D · ${(l.interest_rate_bps / 100).toFixed(1)}%`,
    status: l.status === "approved" ? "ACTIVE" : l.status === "repaid" ? "REPAID" : `DECLINED — ${l.ai_reasoning.slice(0, 40).toUpperCase()}`,
    color: l.status === "approved" ? "#6fbf8f" : l.status === "repaid" ? "#7fd4d4" : "#d6926a",
    reasoning: l.ai_reasoning,
  };
}

export default function LendingPage() {
  const { data: chainLoans, loading, refetch } = useAllLoans();
  const { data: totalBorrowed } = useTotalBorrowed();
  const { execute, loading: writing, error: writeError } = useContractWrite();
  const [amtIdx, setAmtIdx] = useState(0);
  const [termIdx, setTermIdx] = useState(1);
  const [collateral, setCollateral] = useState(COLLATERAL[0]);
  const [phase, setPhase] = useState<"idle" | "review" | "decided">("idle");
  const [lastResult, setLastResult] = useState<{ loanId: string; txHash: string } | null>(null);

  const BOOK = chainLoans.map(loanToRow);

  const submit = async () => {
    setPhase("review");
    setLastResult(null);
    try {
      const result = await execute("LendingMarket", "request_loan", [
        parseInt(AMOUNTS[amtIdx]),
        parseInt(TERMS[termIdx]),
        collateral,
        `Loan request: ${AMOUNT_LABELS[amtIdx]} cGEN for ${TERM_LABELS[termIdx]}, backed by ${collateral}`,
      ]);
      setLastResult({ loanId: String(result.result), txHash: result.txHash });
      refetch();
    } catch { /* error handled by hook */ }
    setPhase("decided");
  };

  return (
    <main style={{ background: "#070a12", color: "#ecebe6", minHeight: "100vh" }}>
      <AppNav tag="LENDING MARKET" active="Lending" status={`● ${totalBorrowed > 0 ? totalBorrowed.toLocaleString() : "0"} DEPLOYED`} />
      <PulseTicker />

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "44px 40px 96px", display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}>
          <span style={{ font: `500 10px ${MONO}`, color: "#7fd4d4", letterSpacing: ".25em" }}>LENDING · CREDIT DESK</span>
          <h1 style={{ margin: 0, font: `300 38px/1.12 ${SANS}`, letterSpacing: "-.015em" }}>Credit priced by reputation and reasoning.</h1>
          <p style={{ margin: 0, font: `400 14px/1.65 ${SANS}`, color: "rgba(236,235,230,.6)" }}>
            Ask in a sentence. A council reads your record, argues the terms, and prices the line — every word preserved onchain.
          </p>
        </div>

        <div className="ce-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, alignItems: "start" }}>
          {/* REQUEST */}
          <div style={{ ...panel, padding: 26, display: "flex", flexDirection: "column", gap: 18 }}>
            <span style={{ ...monoLabel, letterSpacing: ".2em" }}>REQUEST — STATE IT AS A SENTENCE</span>
            <div style={{ font: `400 22px/1.65 ${SERIF}`, fontStyle: "italic", color: "rgba(236,235,230,.9)" }}>
              I need{" "}
              <Slot value={AMOUNT_LABELS[amtIdx]} options={AMOUNT_LABELS} onChange={(v) => setAmtIdx(AMOUNT_LABELS.indexOf(v))} />{" "}
              for{" "}
              <Slot value={TERM_LABELS[termIdx]} options={TERM_LABELS} onChange={(v) => setTermIdx(TERM_LABELS.indexOf(v))} />{" "}
              , backed by{" "}
              <Slot value={collateral} options={COLLATERAL} onChange={setCollateral} />.
            </div>
            <button
              className="ce-btn-primary"
              onClick={submit}
              disabled={phase === "review" || writing}
              style={{ font: `600 14px ${SANS}`, padding: "13px 24px", borderRadius: 7, opacity: phase === "review" ? 0.5 : 1, alignSelf: "flex-start" }}
            >
              {writing ? "Submitting to GenLayer…" : phase === "review" ? "Council convening…" : "Convene a council review"}
            </button>
            <span style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.4)" }}>
              WRITES TO LENDINGMARKET CONTRACT · COUNCIL EVALUATES VIA AI
            </span>
          </div>

          {/* EVALUATION */}
          <div style={{ ...panel, padding: 26, display: "flex", flexDirection: "column", gap: 16, minHeight: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", ...monoLabel }}>
              <span>COUNCIL EVALUATION · YOUR REQUEST</span>
              {phase === "review" && <ThinkingDots size={5} />}
            </div>

            {phase === "idle" && (
              <div style={{ margin: "auto 0", textAlign: "center", padding: "36px 20px" }}>
                <div style={{ font: `italic 400 16px/1.6 ${SERIF}`, color: "rgba(236,235,230,.45)" }}>
                  &quot;The chamber is empty. State a request and the council will be seated.&quot;
                </div>
              </div>
            )}

            {phase === "review" && (
              <div style={{ margin: "auto 0", textAlign: "center", padding: "36px 20px", animation: "ceRise .4s ease-out both" }}>
                <div style={{ font: `italic 400 16px/1.5 ${SERIF}`, color: "rgba(236,235,230,.7)" }}>
                  &quot;Council convened on GenLayer. Validators reasoning over your request…&quot;
                </div>
                <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.35)", marginTop: 12 }}>
                  THIS IS AN ONCHAIN INTELLIGENT CONTRACT CALL — MAY TAKE 30-60 SECONDS
                </div>
              </div>
            )}

            {phase === "decided" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "ceRise .4s ease-out both" }}>
                {writeError ? (
                  <div style={{ border: "1px solid rgba(214,146,106,.4)", borderRadius: 8, padding: 14, background: "rgba(214,146,106,.06)" }}>
                    <div style={{ font: `500 9.5px ${MONO}`, color: "#d6926a", letterSpacing: ".15em" }}>TRANSACTION FAILED</div>
                    <div style={{ font: `400 13px ${SANS}`, marginTop: 4, color: "rgba(236,235,230,.7)" }}>{writeError}</div>
                  </div>
                ) : lastResult ? (
                  <div style={{ border: "1px solid rgba(127,212,212,.35)", borderRadius: 8, padding: 14, background: "rgba(127,212,212,.06)" }}>
                    <div style={{ font: `500 9.5px ${MONO}`, color: "#7fd4d4", letterSpacing: ".15em" }}>LOAN REQUEST RECORDED ONCHAIN</div>
                    <div style={{ font: `500 13.5px ${SANS}`, marginTop: 4 }}>{lastResult.loanId} · {AMOUNT_LABELS[amtIdx]} · {TERM_LABELS[termIdx]}</div>
                    <div style={{ font: `400 10px ${MONO}`, color: "rgba(236,235,230,.45)", marginTop: 6 }}>TX {lastResult.txHash.slice(0, 10)}…{lastResult.txHash.slice(-6)}</div>
                  </div>
                ) : null}
                <button className="ce-btn-secondary" onClick={() => setPhase("idle")} style={{ font: `500 13px ${SANS}`, padding: "10px 20px", borderRadius: 7, alignSelf: "flex-start" }}>
                  New request
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOOK */}
        <div style={{ ...panel, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(236,235,230,.08)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ font: `500 15px ${SANS}` }}>The book</span>
            <span style={monoLabel}>{loading ? "READING ONCHAIN…" : `${BOOK.length} ACTIVE LINES`}</span>
          </div>
          {BOOK.length === 0 && !loading && (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <span style={{ font: `italic 400 14px ${SERIF}`, color: "rgba(236,235,230,.45)" }}>
                No loans on the book yet. Submit the first request above.
              </span>
            </div>
          )}
          {BOOK.map((r, i) => (
            <div key={i} className="ce-row-hover" style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1.4fr", gap: 12, padding: "13px 24px", borderBottom: "1px solid rgba(236,235,230,.06)", font: `400 11px ${MONO}`, alignItems: "baseline" }}>
              <span style={{ color: "rgba(236,235,230,.5)" }}>№{r.no}</span>
              <span style={{ font: `400 13px ${SANS}`, color: "rgba(236,235,230,.85)" }}>{r.borrower}</span>
              <span style={{ color: "rgba(236,235,230,.6)" }}>{r.terms}</span>
              <span style={{ color: r.color }}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
