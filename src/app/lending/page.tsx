"use client";

import { useState } from "react";
import { AppShell } from "@/components/compax/AppShell";
import { PageHead, StatTile, Panel, EmptyState, Tag } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useAllLoans, useTotalBorrowed, useLoanCount, useContractWrite, type LoanData } from "@/hooks/useContract";

function statusTone(s: string) {
  return s === "approved" ? "active" : s === "repaid" ? "standard" : "provisional";
}

export default function LendingPage() {
  const { data: loans, loading, error, refetch } = useAllLoans();
  const { data: totalBorrowed } = useTotalBorrowed();
  const { data: loanCount } = useLoanCount();
  const { execute, loading: writing } = useContractWrite();
  const { tx, run, reset } = useTxStatus();

  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const canSubmit = !!amount && !!days && !!purpose.trim() && !!description.trim() && !writing && tx.phase !== "deliberating";

  const submit = async () => {
    if (!canSubmit) return;
    const r = await run(() =>
      execute("LendingMarket", "request_loan", [parseInt(amount), parseInt(days), purpose.trim(), description.trim()]),
    );
    if (r.ok) {
      setAmount(""); setDays(""); setPurpose(""); setDescription("");
      refetch();
    }
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Lending"
        meta={`${loans.length} active lines`}
      />

      <div className="ce-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28 }}>
        <StatTile label="Total deployed" value={totalBorrowed.toLocaleString()} unit="cGEN" />
        <StatTile label="Loans on book" value={loanCount} />
        <StatTile label="Active lines" value={loans.length} />
      </div>

      <div className="ce-grid ce-2col" style={{ gridTemplateColumns: "1fr 1.2fr", alignItems: "start", marginBottom: 28 }}>
        <Panel style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <span className="ce-section-label">New request</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <input className="ce-input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (cGEN)" />
            <input className="ce-input" type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="Duration (days)" />
          </div>
          <input className="ce-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose — e.g. bridge financing, inventory" maxLength={200} />
          <textarea
            className="ce-input"
            style={{ resize: "vertical" }}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the request — collateral, repayment plan, context the council should weigh"
            maxLength={400}
          />
          <button className="ce-btn" onClick={submit} disabled={!canSubmit} style={{ alignSelf: "flex-start" }}>
            {tx.phase === "deliberating" ? "Submitting…" : "Submit request"}
          </button>
          {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
        </Panel>

        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 22px", borderBottom: "1px solid var(--line-soft)" }}>
            <span className="ce-h2" style={{ fontSize: 15, margin: 0 }}>The book</span>
            <span className="ce-section-label">{loading ? "Reading…" : `${loans.length} active`}</span>
          </div>
          {loans.length === 0 ? (
            <EmptyState>{degraded ? "Book syncing…" : "No loans yet."}</EmptyState>
          ) : (
            loans.map((l: LoanData, i: number) => (
              <div key={l.id || i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, padding: "12px 22px", borderBottom: "1px solid var(--line-soft)" }}>
                <div style={{ minWidth: 0 }}>
                  <span className="ce-mono" style={{ fontSize: 12, color: "var(--text)" }}>
                    {l.amount.toLocaleString()} cGEN · {l.duration_days}d · {(l.interest_rate_bps / 100).toFixed(1)}%
                  </span>
                  {l.ai_reasoning && (
                    <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "3px 0 0", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.ai_reasoning}</p>
                  )}
                </div>
                <Tag tone={statusTone(l.status)}>{l.status}</Tag>
              </div>
            ))
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
