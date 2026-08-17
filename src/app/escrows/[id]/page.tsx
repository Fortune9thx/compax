"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useEscrow, useEscrowChallenges, useContractWrite, useIsClaimed, escrowClaimKey } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";
import { AppealStatus } from "@/components/deliberation/AppealStatus";

export default function EscrowDetailPage() {
  const params = useParams();
  const escrowId = params?.id as string;
  const { address } = useWallet();
  const { data: escrow, loading, refetch } = useEscrow(escrowId);
  const { data: challenges, refetch: refetchChallenges } = useEscrowChallenges(escrowId, 0, 100);
  const { state, run, reset } = useDeliberation();
  const { loading: writing } = useContractWrite();

  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([""]);
  const [challengeReason, setChallengeReason] = useState("");
  const [challengeBond, setChallengeBond] = useState("");

  if (loading && !escrow?.id) {
    return (
      <AppShell>
        <p className="compax-mono text-sm text-text-muted">Loading…</p>
      </AppShell>
    );
  }
  if (!escrow?.id) {
    return (
      <AppShell>
        <EmptyState title="Escrow not found" action={<Link href="/escrows"><Button size="sm">Back to escrows</Button></Link>} />
      </AppShell>
    );
  }

  const isFunder = address?.toLowerCase() === escrow.funder.toLowerCase();
  const isProvider = address?.toLowerCase() === escrow.provider.toLowerCase();

  const doAccept = async () => {
    await run("EscrowAdjudicator", "accept_escrow", [escrowId]);
    refetch();
  };
  const doSubmitEvidence = async () => {
    const urls = evidenceUrls.map((u) => u.trim()).filter(Boolean);
    await run("EscrowAdjudicator", "submit_evidence", [escrowId, evidenceText.trim(), urls]);
    setEvidenceText(""); setEvidenceUrls([""]);
    refetch();
  };
  const doChallenge = async () => {
    await run("EscrowAdjudicator", "challenge", [escrowId, challengeReason.trim()], BigInt(challengeBond || "0"));
    setChallengeReason(""); setChallengeBond("");
    refetch(); refetchChallenges();
  };
  const doResolve = async () => {
    await run("EscrowAdjudicator", "resolve", [escrowId]);
    refetch();
  };

  return (
    <AppShell>
      <div className="compax-mono text-xs text-text-muted mb-4">
        <Link href="/escrows" className="hover:text-text-primary">Escrows</Link> / {escrow.id}
      </div>

      <header className="flex items-start justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3 mb-3">
            <StatusBadge status={escrow.status} />
            {escrow.status === "resolved" && escrow.outcome && <StatusBadge status={escrow.outcome} />}
          </div>
          <p className="compax-serif text-xl text-text-primary leading-snug italic">&ldquo;{escrow.criteria}&rdquo;</p>
          {escrow.required_evidence_types && (
            <p className="text-xs text-text-muted mt-2">
              Required evidence: <span className="text-text-secondary">{escrow.required_evidence_types}</span>
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card>
          <CardLabel>Locked</CardLabel>
          <p className="compax-mono text-xl text-text-primary mt-2">{escrow.amount.toLocaleString()} cGEN</p>
        </Card>
        <Card>
          <CardLabel>Funder → Provider</CardLabel>
          <p className="compax-mono text-xs text-text-secondary mt-2 truncate">{escrow.funder.slice(0, 8)}… → {escrow.provider.slice(0, 8)}…</p>
        </Card>
        <Card>
          <CardLabel>Deadline</CardLabel>
          <p className="compax-mono text-sm text-text-primary mt-2">{escrow.deadline}</p>
        </Card>
      </div>

      {state.phase !== "idle" && (
        <div className="mb-6">
          <DeliberationTheater
            state={state}
            onDismiss={reset}
            resolution={
              state.phase === "accepted" && escrow.status === "resolved"
                ? {
                    reasoning: escrow.ai_reasoning,
                    evidenceSnapshot: escrow.evidence_snapshot,
                    webDataSnapshot: escrow.web_data_snapshot,
                    outcomeLabel: `${escrow.outcome} - ${escrow.released_amount.toLocaleString()} of ${escrow.amount.toLocaleString()} cGEN released`,
                  }
                : undefined
            }
          />
        </div>
      )}

      {escrow.status === "resolved" && state.phase === "idle" && (
        <div className="mb-6">
          <AppealStatus />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {escrow.status === "open" && isProvider && (
            <Card>
              <CardLabel>Accept mandate</CardLabel>
              <p className="text-xs text-text-secondary mt-2 mb-4">
                You&apos;ve been named as provider on this escrow. Accepting opens the window to submit evidence.
              </p>
              <Button onClick={doAccept} disabled={writing || state.phase === "deliberating"}>Accept</Button>
            </Card>
          )}

          {(escrow.status === "accepted" || escrow.status === "evidence_submitted" || escrow.status === "challenged") && isProvider && (
            <Card>
              <CardLabel>Submit evidence</CardLabel>
              {escrow.required_evidence_types && (
                <p className="text-xs text-text-muted mt-2 mb-1">
                  The funder expects: <span className="text-text-secondary">{escrow.required_evidence_types}</span>. The AI adjudicator weighs whether your submission matches this.
                </p>
              )}
              <div className="mt-3 space-y-3">
                <Textarea
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Describe what you delivered, in detail."
                  maxLength={1500}
                  charCount={evidenceText.length}
                  rows={3}
                />
                {evidenceUrls.map((u, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={u}
                      onChange={(e) => setEvidenceUrls((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                      placeholder="https://…"
                    />
                    {evidenceUrls.length > 1 && (
                      <button onClick={() => setEvidenceUrls((arr) => arr.filter((_, idx) => idx !== i))} className="text-text-muted hover:text-danger px-2">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setEvidenceUrls((arr) => [...arr, ""])}
                  className="text-xs text-accent-hover flex items-center gap-1"
                >
                  <Plus size={12} /> Add URL
                </button>
                <Button onClick={doSubmitEvidence} disabled={!evidenceText.trim() || writing || state.phase === "deliberating"} className="w-full">
                  Submit evidence
                </Button>
              </div>
            </Card>
          )}

          {(escrow.status === "evidence_submitted" || escrow.status === "challenged") && (
            <Card>
              <CardLabel>Challenge this evidence</CardLabel>
              <p className="text-xs text-text-secondary mt-2 mb-3">Anyone can challenge with a bond - validators weigh it at resolution.</p>
              <div className="space-y-3">
                <Textarea
                  value={challengeReason}
                  onChange={(e) => setChallengeReason(e.target.value)}
                  placeholder="Why doesn't this evidence satisfy the criteria?"
                  maxLength={500}
                  charCount={challengeReason.length}
                  rows={2}
                />
                <Input type="number" min={1} value={challengeBond} onChange={(e) => setChallengeBond(e.target.value)} placeholder="Bond amount (cGEN)" />
                <Button onClick={doChallenge} disabled={!challengeReason.trim() || !challengeBond || writing || state.phase === "deliberating"} variant="secondary" className="w-full">
                  Challenge
                </Button>
              </div>
            </Card>
          )}

          {(escrow.status === "evidence_submitted" || escrow.status === "challenged") && (
            <Card>
              <CardLabel>Resolve</CardLabel>
              <p className="text-xs text-text-secondary mt-2 mb-4">
                Anyone can trigger resolution. Five validators independently fetch live web data and evaluate the
                evidence against the original criteria.
              </p>
              <Button onClick={doResolve} disabled={writing || state.phase === "deliberating"} className="w-full">
                Resolve
              </Button>
            </Card>
          )}

          {escrow.status === "resolved" && (isFunder || isProvider) && (
            <Card>
              <CardLabel>Reputation</CardLabel>
              <p className="text-xs text-text-secondary mt-2 mb-4">
                Pull this outcome into the provider&apos;s onchain reputation record.
              </p>
              <ClaimReputationButton escrowId={escrowId} />
            </Card>
          )}

        </div>

        <Card className="p-0 overflow-hidden self-start">
          <div className="px-5 py-3.5 border-b border-border">
            <CardLabel>Evidence &amp; challenges</CardLabel>
          </div>
          <div className="px-5 py-4 space-y-4 max-h-[480px] overflow-y-auto">
            {escrow.evidence.length === 0 && challenges.length === 0 ? (
              <p className="text-xs text-text-muted">Nothing submitted yet.</p>
            ) : (
              <>
                {escrow.evidence.map((ev, i) => (
                  <div key={i} className="text-xs border-b border-border/60 pb-3 last:border-0">
                    <p className="compax-mono text-[10px] text-text-muted mb-1">{ev.submitter.slice(0, 10)}…</p>
                    <p className="text-text-secondary leading-relaxed">{ev.text}</p>
                    {ev.urls.map((u, j) => (
                      <a key={j} href={u} target="_blank" rel="noreferrer" className="block compax-mono text-accent-hover mt-1 truncate hover:underline">
                        {u}
                      </a>
                    ))}
                  </div>
                ))}
                {challenges.map((c, i) => (
                  <div key={i} className="text-xs border-b border-border/60 pb-3 last:border-0">
                    <p className="compax-mono text-[10px] text-warning mb-1">Challenge · {c.bond.toLocaleString()} cGEN bond</p>
                    <p className="text-text-secondary leading-relaxed">{c.reason}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ClaimReputationButton({ escrowId }: { escrowId: string }) {
  const { execute, loading } = useContractWrite();
  const claimKey = escrowClaimKey(CONTRACTS.EscrowAdjudicator, escrowId);
  const { data: alreadyClaimed, refetch: refetchClaimed } = useIsClaimed(claimKey);
  const [err, setErr] = useState<string | null>(null);

  const claim = async () => {
    setErr(null);
    try {
      await execute("ReputationRegistry", "record_from_escrow", [CONTRACTS.EscrowAdjudicator, escrowId]);
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
