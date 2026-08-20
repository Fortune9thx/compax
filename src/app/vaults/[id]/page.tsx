"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { AppealStatus } from "@/components/deliberation/AppealStatus";
import { useDeliberation } from "@/hooks/useDeliberation";
import {
  useVault,
  useVaultDeposit,
  useVaultMovements,
  useMovementChallenges,
  useContractWrite,
  useIsClaimed,
  vaultClaimKey,
  type VaultMovement,
} from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";

export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params?.id as string;
  const { address } = useWallet();
  const { data: vault, loading, refetch } = useVault(vaultId);
  const { data: myDeposit, refetch: refetchDeposit } = useVaultDeposit(vaultId, address || "");
  const { data: movements, refetch: refetchMovements } = useVaultMovements(vaultId, 0, 100);
  const { state, run, reset } = useDeliberation();

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [moveInstrument, setMoveInstrument] = useState<"escrow" | "prediction" | "credit" | null>(null);
  const [moveAmt, setMoveAmt] = useState("");
  const [justification, setJustification] = useState("");
  const [escProvider, setEscProvider] = useState("");
  const [escCriteria, setEscCriteria] = useState("");
  const [escDeadline, setEscDeadline] = useState("");
  const [escEvidenceTypes, setEscEvidenceTypes] = useState("text, urls");
  const [creditLineId, setCreditLineId] = useState("");
  const [predMarketId, setPredMarketId] = useState("");
  const [predPosition, setPredPosition] = useState<"yes" | "no">("yes");

  if (loading && !vault?.id) {
    return (
      <AppShell>
        <p className="compax-mono text-sm text-text-muted">Loading…</p>
      </AppShell>
    );
  }
  if (!vault?.id) {
    return (
      <AppShell>
        <EmptyState title="Vault not found" action={<Link href="/vaults"><Button size="sm">Back to vaults</Button></Link>} />
      </AppShell>
    );
  }

  const isOwner = address?.toLowerCase() === vault.owner.toLowerCase();
  const refreshAll = () => { refetch(); refetchDeposit(); refetchMovements(); };

  const doDeposit = async () => {
    if (!depositAmt) return;
    await run("VaultManager", "deposit", [vaultId], BigInt(depositAmt));
    setDepositAmt("");
    refreshAll();
  };
  const doWithdraw = async () => {
    if (!withdrawAmt) return;
    await run("VaultManager", "withdraw_deposit", [vaultId, Number(withdrawAmt)]);
    setWithdrawAmt("");
    refreshAll();
  };
  const canMove =
    !!moveInstrument && !!moveAmt && !!justification.trim() &&
    (moveInstrument !== "escrow" || (escProvider.trim() && escCriteria.trim() && escDeadline.trim())) &&
    (moveInstrument !== "credit" || creditLineId.trim()) &&
    (moveInstrument !== "prediction" || predMarketId.trim());

  const doMove = async () => {
    if (!canMove || !moveInstrument) return;
    let r;
    if (moveInstrument === "escrow") {
      r = await run("VaultManager", "move_to_escrow", [
        vaultId, CONTRACTS.EscrowAdjudicator, Number(moveAmt),
        escProvider.trim(), escCriteria.trim(), escDeadline.trim(), escEvidenceTypes.trim(),
        justification.trim(),
      ]);
    } else if (moveInstrument === "credit") {
      r = await run("VaultManager", "move_to_credit", [
        vaultId, CONTRACTS.CreditLine, creditLineId.trim(), Number(moveAmt), justification.trim(),
      ]);
    } else {
      r = await run("VaultManager", "move_to_prediction", [
        vaultId, CONTRACTS.PredictionMarket, predMarketId.trim(), Number(moveAmt), predPosition, justification.trim(),
      ]);
    }
    if (r?.ok) {
      setMoveAmt(""); setJustification(""); setMoveInstrument(null);
      setEscProvider(""); setEscCriteria(""); setEscDeadline("");
      setCreditLineId(""); setPredMarketId("");
      refreshAll();
    }
  };

  return (
    <AppShell>
      <div className="compax-mono text-xs text-text-muted mb-4">
        <Link href="/vaults" className="hover:text-text-primary">Vaults</Link> / {vault.id}
      </div>

      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary mb-2">{vault.name}</h1>
        <p className="compax-serif text-lg text-text-muted italic leading-snug">&ldquo;{vault.objective}&rdquo;</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card><CardLabel>Live treasury</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.treasury.toLocaleString()} cGEN</p></Card>
        <Card><CardLabel>Risk tolerance</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.risk_tolerance}/10</p></Card>
        <Card><CardLabel>Deposits</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.deposit_count}</p></Card>
      </div>

      <Card className="mb-8">
        <CardLabel>Mandate scope</CardLabel>
        <div className="flex gap-1.5 flex-wrap mt-3 mb-3">
          {vault.allowed_instruments.map((i) => <Badge key={i} tone="active">{i}</Badge>)}
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">{vault.mandate_reasoning}</p>
      </Card>

      {state.phase !== "idle" && (
        <div className="mb-6">
          <DeliberationTheater state={state} onDismiss={reset} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardLabel>Your deposit</CardLabel>
            <p className="text-xs text-text-muted mt-2 mb-3">
              {address
                ? `You have ${myDeposit.amount.toLocaleString()} cGEN of your own capital in this vault, reclaimable any time it isn't currently deployed.`
                : "Connect a wallet to deposit or see your claim."}
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input type="number" min={1} value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Deposit amount" />
                <Button onClick={doDeposit} disabled={!depositAmt || !address || state.phase === "deliberating"}>Deposit</Button>
              </div>
              <div className="flex gap-2">
                <Input type="number" min={1} max={myDeposit.amount} value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} placeholder="Withdraw amount" />
                <Button variant="secondary" onClick={doWithdraw} disabled={!withdrawAmt || !myDeposit.amount || state.phase === "deliberating"}>Withdraw</Button>
              </div>
            </div>
          </Card>

          {isOwner && (
            <Card>
              <CardLabel>Move capital to an instrument</CardLabel>
              <p className="text-xs text-text-muted mt-2 mb-3">
                Funds the real instrument directly - you never touch the principal, and the mandate is enforced
                onchain, not just by trusting you to spend it as claimed. Any depositor can later challenge this
                specific move against the vault&apos;s stated objective.
              </p>
              <div className="flex gap-2 mb-3">
                {(["escrow", "prediction", "credit"] as const).map((instrument) => {
                  const allowed = vault.allowed_instruments.includes(instrument);
                  return (
                    <Button
                      key={instrument}
                      size="sm"
                      variant={moveInstrument === instrument ? "primary" : allowed ? "secondary" : "ghost"}
                      disabled={!allowed}
                      onClick={() => setMoveInstrument(instrument)}
                      title={!allowed ? "This vault's risk tier doesn't permit this instrument" : undefined}
                    >
                      {instrument}
                    </Button>
                  );
                })}
              </div>

              {moveInstrument === "escrow" && (
                <div className="space-y-3">
                  <Input value={escProvider} onChange={(e) => setEscProvider(e.target.value)} placeholder="Provider address - who must deliver" />
                  <Textarea value={escCriteria} onChange={(e) => setEscCriteria(e.target.value)} placeholder="Success criteria" maxLength={800} charCount={escCriteria.length} rows={2} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={escDeadline} onChange={(e) => setEscDeadline(e.target.value)} />
                    <Input value={escEvidenceTypes} onChange={(e) => setEscEvidenceTypes(e.target.value)} placeholder="Required evidence types" />
                  </div>
                  <p className="text-[11px] text-text-muted">Creates a brand-new escrow on {CONTRACTS.EscrowAdjudicator.slice(0, 10)}…, funded by this vault, with you as funder.</p>
                </div>
              )}

              {moveInstrument === "credit" && (
                <div className="space-y-3">
                  <Input value={creditLineId} onChange={(e) => setCreditLineId(e.target.value)} placeholder="Existing line id, e.g. LINE-3" />
                  <p className="text-[11px] text-text-muted">
                    Funds an already-open line as lender - browse{" "}
                    <Link href="/credit" className="text-accent-hover hover:underline">/credit</Link>{" "}
                    for an open line&apos;s id first.
                  </p>
                </div>
              )}

              {moveInstrument === "prediction" && (
                <div className="space-y-3">
                  <Input value={predMarketId} onChange={(e) => setPredMarketId(e.target.value)} placeholder="Existing market id, e.g. MKT-2" />
                  <div className="flex gap-2">
                    <Button size="sm" variant={predPosition === "yes" ? "primary" : "secondary"} onClick={() => setPredPosition("yes")}>YES</Button>
                    <Button size="sm" variant={predPosition === "no" ? "primary" : "secondary"} onClick={() => setPredPosition("no")}>NO</Button>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    Stakes on an active market - browse{" "}
                    <Link href="/markets" className="text-accent-hover hover:underline">/markets</Link>{" "}
                    for a market&apos;s id first. You claim any winnings yourself, directly, from the market page.
                  </p>
                </div>
              )}

              {moveInstrument && (
                <div className="space-y-3 mt-3">
                  <Input type="number" min={1} max={vault.treasury} value={moveAmt} onChange={(e) => setMoveAmt(e.target.value)} placeholder="Amount" />
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Why does this specific move serve the vault's stated objective? This is what a challenger would dispute."
                    maxLength={400}
                    charCount={justification.length}
                    rows={2}
                  />
                  <Button className="w-full" onClick={doMove} disabled={!canMove || state.phase === "deliberating"}>
                    Move to {moveInstrument}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        <Card className="p-0 overflow-hidden self-start">
          <div className="px-5 py-3.5 border-b border-border">
            <CardLabel>Capital movements</CardLabel>
          </div>
          <div className="px-5 py-4 space-y-4 max-h-[600px] overflow-y-auto">
            {movements.length === 0 ? (
              <p className="text-xs text-text-muted">No capital has left this vault yet.</p>
            ) : (
              [...movements].reverse().map((m) => (
                <MovementRow key={m.id} movement={m} isOwner={isOwner} onChanged={refreshAll} />
              ))
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function MovementRow({ movement, isOwner, onChanged }: { movement: VaultMovement; isOwner: boolean; onChanged: () => void }) {
  const { address } = useWallet();
  const { data: challenges, refetch: refetchChallenges } = useMovementChallenges(movement.id, 0, 20);
  const { state, run, reset } = useDeliberation();

  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [bond, setBond] = useState("");

  const refresh = () => { refetchChallenges(); onChanged(); };

  const doChallenge = async () => {
    if (!reason.trim() || !bond) return;
    const r = await run("VaultManager", "challenge_movement", [movement.id, reason.trim(), evidenceUrl.trim()], BigInt(bond));
    if (r.ok) { setReason(""); setEvidenceUrl(""); setBond(""); refresh(); }
  };
  const doResolve = async () => {
    const r = await run("VaultManager", "resolve_movement", [movement.id]);
    if (r.ok) refresh();
  };

  return (
    <div className="text-xs border-b border-border/60 pb-4 last:border-0">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="compax-mono text-[10px] text-text-muted">{movement.id}</span>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={movement.status} />
          {movement.status === "resolved" && movement.outcome && <StatusBadge status={movement.outcome} />}
        </div>
      </div>
      <p className="text-text-secondary">
        <span className="text-text-primary compax-mono">{movement.amount.toLocaleString()} cGEN</span> toward{" "}
        <span className="text-text-primary">{movement.instrument}</span>
      </p>
      <p className="text-text-muted leading-relaxed mt-1">&ldquo;{movement.justification}&rdquo;</p>

      {state.phase !== "idle" && (
        <div className="mt-2">
          <DeliberationTheater
            state={state}
            onDismiss={reset}
            resolution={
              state.phase === "accepted" && movement.status === "resolved"
                ? { reasoning: movement.ai_reasoning, outcomeLabel: movement.outcome }
                : undefined
            }
          />
        </div>
      )}

      {movement.status === "executed" && (
        <div className="mt-2 space-y-2">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Challenge: why didn't this serve the mandate?" rows={2} maxLength={500} charCount={reason.length} />
          <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="Evidence URL (optional, but fetched live and weighed as primary evidence)" />
          <div className="flex gap-2">
            <Input type="number" min={1} value={bond} onChange={(e) => setBond(e.target.value)} placeholder="Bond (cGEN)" />
            <Button size="sm" variant="secondary" onClick={doChallenge} disabled={!reason.trim() || !bond || !address || state.phase === "deliberating"}>Challenge</Button>
          </div>
        </div>
      )}

      {movement.status === "challenged" && (
        <div className="mt-2 space-y-2">
          {challenges.map((c, i) => (
            <div key={i}>
              <p className="text-warning">
                {c.bond.toLocaleString()} cGEN bond - {c.reason}
              </p>
              {c.evidence_url && (
                <a href={c.evidence_url} target="_blank" rel="noreferrer" className="block compax-mono text-[10px] text-accent-hover hover:underline truncate">
                  {c.evidence_url}
                </a>
              )}
            </div>
          ))}
          <Button size="sm" onClick={doResolve} disabled={state.phase === "deliberating"}>Resolve</Button>
        </div>
      )}

      {movement.status === "resolved" && (
        <div className="mt-2 space-y-2">
          {movement.ai_reasoning && <p className="text-text-secondary leading-relaxed">{movement.ai_reasoning}</p>}
          {state.phase === "idle" && <AppealStatus />}
          {(isOwner || challenges.some((c) => c.challenger.toLowerCase() === address?.toLowerCase())) && (
            <ClaimVaultReputationButton movementId={movement.id} />
          )}
        </div>
      )}
    </div>
  );
}

function ClaimVaultReputationButton({ movementId }: { movementId: string }) {
  const { execute, loading } = useContractWrite();
  const claimKey = vaultClaimKey(CONTRACTS.VaultManager, movementId);
  const { data: alreadyClaimed, refetch: refetchClaimed } = useIsClaimed(claimKey);
  const [err, setErr] = useState<string | null>(null);

  const claim = async () => {
    setErr(null);
    try {
      await execute("ReputationRegistry", "record_from_vault", [CONTRACTS.VaultManager, movementId]);
      refetchClaimed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  if (alreadyClaimed) return <p className="text-success">Reputation claimed.</p>;
  return (
    <div>
      <Button size="sm" onClick={claim} disabled={loading}>{loading ? "Claiming…" : "Claim reputation update"}</Button>
      {err && <p className="text-danger mt-1">{err}</p>}
    </div>
  );
}
