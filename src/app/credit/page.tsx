"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, SkeletonGrid, ErrorBanner } from "@/components/ui/States";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useAllCreditLines, useCreditLine, useContractWrite, useIsClaimed, creditClaimKey, type CreditLineData } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";
import { AppealStatus } from "@/components/deliberation/AppealStatus";

export default function CreditPage() {
  const { data: lines, loading, error, refetch } = useAllCreditLines(0, 100);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const sorted = [...lines].reverse();

  return (
    <AppShell degraded={degraded}>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="compax-serif text-3xl text-text-primary">Collateralized credit</h1>
          <p className="text-sm text-text-muted mt-1.5">
            Post collateral, get AI-reasoned terms. Any lender funds the line directly - no platform pool.
          </p>
        </div>
        <Link href="/credit/create">
          <Button><Plus size={15} /> Open a line</Button>
        </Link>
      </header>

      {error && !degraded && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && sorted.length === 0 ? (
        <SkeletonGrid count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No credit lines yet"
          description="Post collateral and state your purpose to open the first one."
          action={<Link href="/credit/create"><Button size="sm">Open a line</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((l) => (
            <button key={l.id} onClick={() => setSelectedId(l.id)} className="text-left">
              <Card className="h-full hover:border-text-muted transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>{l.id}</CardLabel>
                  <StatusBadge status={l.status} />
                </div>
                <p className="text-sm text-text-primary leading-relaxed line-clamp-2 mb-3">{l.purpose}</p>
                <div className="grid grid-cols-2 gap-2 compax-mono text-xs text-text-secondary">
                  <span>Collateral: {l.collateral_amount.toLocaleString()}</span>
                  <span>Max loan: {l.max_loan_amount.toLocaleString()}</span>
                  <span>Rate: {(l.interest_rate_bps / 100).toFixed(1)}%</span>
                  {l.loan_amount > 0 && <span>Funded: {l.loan_amount.toLocaleString()}</span>}
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <CreditLineModal lineId={selectedId} onClose={() => setSelectedId(null)} onChanged={refetch} />
      )}
    </AppShell>
  );
}

function CreditLineModal({ lineId, onClose, onChanged }: { lineId: string; onClose: () => void; onChanged: () => void }) {
  const { address, connected } = useWallet();
  const { data: line, refetch } = useCreditLine(lineId);
  const { state, run, reset } = useDeliberation();

  const [fundAmt, setFundAmt] = useState<string | null>(null);
  const [defaultEvidence, setDefaultEvidence] = useState("");
  const [defaultEvidenceUrl, setDefaultEvidenceUrl] = useState("");
  const [rebuttal, setRebuttal] = useState("");

  if (!line?.id) return null;
  const l = line as CreditLineData;
  const isBorrower = address?.toLowerCase() === l.borrower.toLowerCase();
  const isLender = l.lender && address?.toLowerCase() === l.lender.toLowerCase();
  const owed = l.status === "funded" ? l.loan_amount + Math.floor((l.loan_amount * l.interest_rate_bps) / 10000) : 0;
  const dueDatePassed = l.due_date ? new Date(l.due_date) < new Date() : false;

  const refresh = () => { refetch(); onChanged(); };

  const fundValue = fundAmt ?? String(l.max_loan_amount);
  const doFund = async () => {
    if (!fundValue) return;
    const r = await run("CreditLine", "fund_line", [lineId, ""], BigInt(fundValue));
    if (r.ok) { setFundAmt(null); refresh(); }
  };
  const doRepay = async () => {
    const r = await run("CreditLine", "repay", [lineId], BigInt(owed));
    if (r.ok) refresh();
  };
  const doClaimDefault = async () => {
    if (!defaultEvidence.trim()) return;
    const r = await run("CreditLine", "claim_default", [lineId, defaultEvidence.trim(), defaultEvidenceUrl.trim()]);
    if (r.ok) { setDefaultEvidence(""); setDefaultEvidenceUrl(""); refresh(); }
  };
  const doDispute = async () => {
    if (!rebuttal.trim()) return;
    const r = await run("CreditLine", "dispute_default", [lineId, rebuttal.trim()]);
    if (r.ok) { setRebuttal(""); refresh(); }
  };
  const doResolveDefault = async () => {
    const r = await run("CreditLine", "resolve_default", [lineId]);
    if (r.ok) refresh();
  };

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title={lineId}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={l.status} />
        </div>
        <p className="text-sm text-text-primary">{l.purpose}</p>
        <div className="grid grid-cols-2 gap-3 compax-mono text-xs text-text-secondary">
          <span>Collateral: {l.collateral_amount.toLocaleString()} cGEN</span>
          <span>Max loan: {l.max_loan_amount.toLocaleString()} cGEN</span>
          <span>Rate: {(l.interest_rate_bps / 100).toFixed(1)}%</span>
          {l.loan_amount > 0 && <span>Funded: {l.loan_amount.toLocaleString()} cGEN</span>}
          {l.due_date && <span>Due: {new Date(l.due_date).toLocaleDateString()}</span>}
        </div>
        {l.ai_terms_reasoning && <p className="text-xs text-text-muted leading-relaxed border-t border-border pt-3">{l.ai_terms_reasoning}</p>}

        {state.phase !== "idle" && (
          <DeliberationTheater
            state={state}
            onDismiss={reset}
            resolution={state.phase === "accepted" && l.status === "resolved" ? { reasoning: l.ai_reasoning, outcomeLabel: `${l.collateral_to_lender.toLocaleString()} to lender, ${l.collateral_to_borrower.toLocaleString()} to borrower` } : undefined}
          />
        )}

        {l.status === "open" && !isBorrower && connected && (
          <div className="pt-2">
            <div className="flex gap-2">
              <Input type="number" min={1} max={l.max_loan_amount} value={fundValue} onChange={(e) => setFundAmt(e.target.value)} placeholder="Fund amount" />
              <Button onClick={doFund} disabled={!fundValue || state.phase === "deliberating"}>Fund</Button>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Pre-filled with the full max loan ({l.max_loan_amount.toLocaleString()} cGEN). This is a
              single-lender line, not a pool - whoever funds first (even for less than the max) closes
              it to everyone else, so funding the full amount gets the borrower what they were approved for.
            </p>
          </div>
        )}

        {l.status === "funded" && isBorrower && (
          <Button className="w-full" onClick={doRepay} disabled={state.phase === "deliberating"}>
            Repay {owed.toLocaleString()} cGEN (principal + interest)
          </Button>
        )}

        {l.status === "funded" && isLender && (
          <div className="space-y-2 pt-2 border-t border-border">
            <Textarea value={defaultEvidence} onChange={(e) => setDefaultEvidence(e.target.value)} placeholder="Claim default - evidence the borrower is in default." rows={2} maxLength={600} charCount={defaultEvidence.length} />
            <Input value={defaultEvidenceUrl} onChange={(e) => setDefaultEvidenceUrl(e.target.value)} placeholder="Evidence URL (optional, but fetched live and weighed as primary evidence)" />
            {dueDatePassed ? (
              <Button variant="danger" className="w-full" onClick={doClaimDefault} disabled={!defaultEvidence.trim() || state.phase === "deliberating"}>Claim default</Button>
            ) : (
              <p className="text-xs text-text-muted">
                Can&apos;t claim default until the due date passes{l.due_date ? ` (${new Date(l.due_date).toLocaleDateString()})` : ""}.
              </p>
            )}
          </div>
        )}

        {l.status === "default_claimed" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs text-text-secondary"><span className="text-warning">Lender&apos;s claim:</span> {l.default_evidence}</p>
            {l.default_evidence_url && (
              <a href={l.default_evidence_url} target="_blank" rel="noreferrer" className="block compax-mono text-[11px] text-accent-hover hover:underline truncate">
                {l.default_evidence_url}
              </a>
            )}
            {isBorrower && (
              <>
                <Textarea value={rebuttal} onChange={(e) => setRebuttal(e.target.value)} placeholder="Rebut the default claim." rows={2} maxLength={600} charCount={rebuttal.length} />
                <Button variant="secondary" className="w-full" onClick={doDispute} disabled={!rebuttal.trim() || state.phase === "deliberating"}>Dispute</Button>
              </>
            )}
            <Button className="w-full" onClick={doResolveDefault} disabled={state.phase === "deliberating"}>Resolve</Button>
          </div>
        )}

        {l.status === "disputed" && (
          <div className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs text-text-secondary"><span className="text-warning">Lender&apos;s claim:</span> {l.default_evidence}</p>
            {l.default_evidence_url && (
              <a href={l.default_evidence_url} target="_blank" rel="noreferrer" className="block compax-mono text-[11px] text-accent-hover hover:underline truncate">
                {l.default_evidence_url}
              </a>
            )}
            <p className="text-xs text-text-secondary"><span className="text-accent-hover">Rebuttal:</span> {l.borrower_rebuttal}</p>
            <Button className="w-full" onClick={doResolveDefault} disabled={state.phase === "deliberating"}>Resolve</Button>
          </div>
        )}

        {(l.status === "repaid" || l.status === "resolved") && state.phase === "idle" && (
          <div className="pt-2 border-t border-border">
            <AppealStatus />
          </div>
        )}

        {(l.status === "repaid" || l.status === "resolved") && isBorrower && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs text-text-muted">Pull this outcome into your onchain reputation record.</p>
            <ClaimCreditReputationButton lineId={lineId} />
          </div>
        )}
      </div>
    </Modal>
  );
}

function ClaimCreditReputationButton({ lineId }: { lineId: string }) {
  const { execute, loading } = useContractWrite();
  const claimKey = creditClaimKey(CONTRACTS.CreditLine, lineId);
  const { data: alreadyClaimed, refetch: refetchClaimed } = useIsClaimed(claimKey);
  const [err, setErr] = useState<string | null>(null);

  const claim = async () => {
    setErr(null);
    try {
      await execute("ReputationRegistry", "record_from_credit", [CONTRACTS.CreditLine, lineId]);
      refetchClaimed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  if (alreadyClaimed) return <p className="text-xs text-success">Reputation claimed.</p>;
  return (
    <div>
      <Button size="sm" onClick={claim} disabled={loading}>{loading ? "Claiming…" : "Claim reputation update"}</Button>
      {err && <p className="text-xs text-danger mt-2">{err}</p>}
    </div>
  );
}
