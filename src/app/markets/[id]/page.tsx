"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useMarket, useMarketUserStake, useMarketChallenges, useContractWrite, useIsClaimed, predictionClaimKey } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";
import { AppealStatus } from "@/components/deliberation/AppealStatus";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params?.id as string;
  const { address, connected } = useWallet();
  const { data: market, loading, refetch } = useMarket(marketId);
  const { data: myStake, refetch: refetchStake } = useMarketUserStake(marketId, address || "");
  const { data: challenges } = useMarketChallenges(marketId, 0, 100);
  const { state, run, reset } = useDeliberation();

  const [stakeAmt, setStakeAmt] = useState("");
  const [position, setPosition] = useState<"yes" | "no">("yes");
  const [proposedOutcome, setProposedOutcome] = useState<"yes" | "no">("yes");
  const [proposalEvidence, setProposalEvidence] = useState("");
  const [challengeReason, setChallengeReason] = useState("");
  const [challengeBond, setChallengeBond] = useState("");

  if (loading && !market?.id) {
    return <AppShell><p className="compax-mono text-sm text-text-muted">Loading…</p></AppShell>;
  }
  if (!market?.id) {
    return (
      <AppShell>
        <EmptyState title="Market not found" action={<Link href="/markets"><Button size="sm">Back to markets</Button></Link>} />
      </AppShell>
    );
  }

  const total = market.total_yes + market.total_no;
  const yesPct = total > 0 ? Math.round((market.total_yes / total) * 100) : 50;

  const doStake = async () => {
    if (!stakeAmt) return;
    await run("PredictionMarket", "stake", [marketId, position, ""], BigInt(stakeAmt));
    setStakeAmt("");
    refetch(); refetchStake();
  };
  const doPropose = async () => {
    if (!proposalEvidence.trim()) return;
    await run("PredictionMarket", "propose_outcome", [marketId, proposedOutcome, proposalEvidence.trim()]);
    setProposalEvidence("");
    refetch();
  };
  const doChallenge = async () => {
    if (!challengeReason.trim() || !challengeBond) return;
    await run("PredictionMarket", "challenge_proposal", [marketId, challengeReason.trim()], BigInt(challengeBond));
    setChallengeReason(""); setChallengeBond("");
    refetch();
  };
  const doResolve = async () => {
    await run("PredictionMarket", "resolve", [marketId]);
    refetch();
  };
  const doClaim = async () => {
    await run("PredictionMarket", "claim_winnings", [marketId]);
    refetchStake();
  };

  return (
    <AppShell>
      <div className="compax-mono text-xs text-text-muted mb-4">
        <Link href="/markets" className="hover:text-text-primary">Markets</Link> / {market.id}
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <StatusBadge status={market.status} />
          {market.status === "resolved" && market.outcome && <StatusBadge status={market.outcome} />}
        </div>
        <p className="compax-serif text-xl text-text-primary leading-snug italic max-w-2xl">&ldquo;{market.question}&rdquo;</p>
      </header>

      <Card className="mb-8">
        <div className="h-2 rounded-full overflow-hidden bg-bg-elevated flex mb-2">
          <div className="bg-success h-full" style={{ width: `${yesPct}%` }} />
          <div className="bg-danger h-full" style={{ width: `${100 - yesPct}%` }} />
        </div>
        <div className="flex justify-between compax-mono text-xs">
          <span className="text-success">YES {market.total_yes.toLocaleString()} cGEN ({yesPct}%)</span>
          <span className="text-danger">NO {market.total_no.toLocaleString()} cGEN ({100 - yesPct}%)</span>
        </div>
      </Card>

      {state.phase !== "idle" && (
        <div className="mb-6">
          <DeliberationTheater
            state={state}
            onDismiss={reset}
            resolution={
              state.phase === "accepted" && market.status === "resolved"
                ? { reasoning: market.resolution_reasoning, webDataSnapshot: market.web_data_snapshot, outcomeLabel: `Resolved: ${market.outcome?.toUpperCase()}` }
                : undefined
            }
          />
        </div>
      )}

      {market.status === "resolved" && state.phase === "idle" && (
        <div className="mb-6">
          <AppealStatus />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {market.status === "active" && (
            <Card>
              <CardLabel>Stake a position</CardLabel>
              <div className="flex gap-2 mt-3 mb-3">
                <Button size="sm" variant={position === "yes" ? "primary" : "secondary"} onClick={() => setPosition("yes")} disabled={!!myStake.position && myStake.position !== "yes"}>YES</Button>
                <Button size="sm" variant={position === "no" ? "primary" : "secondary"} onClick={() => setPosition("no")} disabled={!!myStake.position && myStake.position !== "no"}>NO</Button>
              </div>
              <div className="flex gap-2">
                <Input type="number" min={1} value={stakeAmt} onChange={(e) => setStakeAmt(e.target.value)} placeholder="Amount (cGEN)" />
                <Button onClick={doStake} disabled={!stakeAmt || !connected || state.phase === "deliberating"}>Stake</Button>
              </div>
              {myStake.position && (
                <p className="text-xs text-text-muted mt-2">
                  You&apos;ve staked {myStake.amount?.toLocaleString()} cGEN on {myStake.position.toUpperCase()}.
                </p>
              )}
            </Card>
          )}

          {market.status === "active" && (
            <Card>
              <CardLabel>Propose outcome</CardLabel>
              <p className="text-xs text-text-muted mt-2 mb-3">Anyone can propose - this opens a challenge window before resolution.</p>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={proposedOutcome === "yes" ? "primary" : "secondary"} onClick={() => setProposedOutcome("yes")}>YES</Button>
                <Button size="sm" variant={proposedOutcome === "no" ? "primary" : "secondary"} onClick={() => setProposedOutcome("no")}>NO</Button>
              </div>
              <Textarea value={proposalEvidence} onChange={(e) => setProposalEvidence(e.target.value)} placeholder="Evidence supporting this outcome." maxLength={800} charCount={proposalEvidence.length} rows={3} />
              <Button className="w-full mt-3" onClick={doPropose} disabled={!proposalEvidence.trim() || state.phase === "deliberating"}>Propose</Button>
            </Card>
          )}

          {(market.status === "proposed" || market.status === "challenged") && (
            <>
              <Card>
                <CardLabel>Proposed outcome</CardLabel>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={market.proposed_outcome} />
                  <span className="compax-mono text-[10px] text-text-muted">by {market.proposed_by.slice(0, 10)}…</span>
                </div>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">{market.proposed_evidence}</p>
              </Card>
              <Card>
                <CardLabel>Challenge this proposal</CardLabel>
                <div className="mt-3 space-y-3">
                  <Textarea value={challengeReason} onChange={(e) => setChallengeReason(e.target.value)} placeholder="Why is this proposal wrong?" maxLength={500} charCount={challengeReason.length} rows={2} />
                  <Input type="number" min={1} value={challengeBond} onChange={(e) => setChallengeBond(e.target.value)} placeholder="Bond amount (cGEN)" />
                  <Button variant="secondary" className="w-full" onClick={doChallenge} disabled={!challengeReason.trim() || !challengeBond || state.phase === "deliberating"}>Challenge</Button>
                </div>
              </Card>
              <Card>
                <CardLabel>Resolve</CardLabel>
                <p className="text-xs text-text-muted mt-2 mb-3">Five validators independently determine the real outcome - not a rubber stamp of the proposal.</p>
                <Button className="w-full" onClick={doResolve} disabled={state.phase === "deliberating"}>Resolve</Button>
              </Card>
            </>
          )}

          {market.status === "resolved" && myStake.position && (
            <Card>
              <CardLabel>Your stake</CardLabel>
              {myStake.claimed ? (
                <p className="text-xs text-text-muted mt-2">Already claimed.</p>
              ) : myStake.position === market.outcome ? (
                <>
                  <p className="text-xs text-text-secondary mt-2 mb-3">
                    You staked {myStake.position.toUpperCase()} - winning side. Claim your stake plus a proportional share of the losing pool.
                  </p>
                  <Button onClick={doClaim} disabled={state.phase === "deliberating"}>Claim winnings</Button>
                </>
              ) : (
                <p className="text-xs text-text-muted mt-2">You staked {myStake.position.toUpperCase()} - resolved {market.outcome?.toUpperCase()}. Nothing to claim.</p>
              )}
            </Card>
          )}

          {market.status === "resolved" && myStake.position && address && (
            <Card>
              <CardLabel>Reputation</CardLabel>
              <p className="text-xs text-text-secondary mt-2 mb-4">
                Pull this outcome into your onchain reputation record based on whether your staked position matched the resolved outcome.
              </p>
              <ClaimMarketReputationButton marketId={marketId} userAddress={address} />
            </Card>
          )}
        </div>

        <Card className="p-0 overflow-hidden self-start">
          <div className="px-5 py-3.5 border-b border-border"><CardLabel>Challenges</CardLabel></div>
          <div className="px-5 py-4 space-y-3 max-h-[400px] overflow-y-auto">
            {challenges.length === 0 ? (
              <p className="text-xs text-text-muted">None raised.</p>
            ) : (
              challenges.map((c, i) => (
                <div key={i} className="text-xs border-b border-border/60 pb-3 last:border-0">
                  <p className="compax-mono text-[10px] text-warning mb-1">{c.bond.toLocaleString()} cGEN bond</p>
                  <p className="text-text-secondary leading-relaxed">{c.reason}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ClaimMarketReputationButton({ marketId, userAddress }: { marketId: string; userAddress: string }) {
  const { execute, loading } = useContractWrite();
  const claimKey = predictionClaimKey(CONTRACTS.PredictionMarket, marketId, userAddress);
  const { data: alreadyClaimed, refetch: refetchClaimed } = useIsClaimed(claimKey);
  const [err, setErr] = useState<string | null>(null);

  const claim = async () => {
    setErr(null);
    try {
      await execute("ReputationRegistry", "record_from_prediction", [CONTRACTS.PredictionMarket, marketId, userAddress]);
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
