"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useVault } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";

const INSTRUMENT_ROUTES: Record<string, string> = {
  escrow: "/escrows/create",
  prediction: "/markets/create",
  credit: "/credit/create",
};
const MOVE_METHODS: Record<string, string> = {
  escrow: "move_to_escrow",
  prediction: "move_to_prediction",
  credit: "move_to_credit",
};

export default function VaultDetailPage() {
  const params = useParams();
  const vaultId = params?.id as string;
  const { address } = useWallet();
  const { data: vault, loading, refetch } = useVault(vaultId);
  const { state, run, reset } = useDeliberation();

  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [moveAmt, setMoveAmt] = useState<Record<string, string>>({});

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

  const doDeposit = async () => {
    if (!depositAmt) return;
    await run("VaultManager", "deposit", [vaultId], BigInt(depositAmt));
    setDepositAmt("");
    refetch();
  };
  const doWithdraw = async () => {
    if (!withdrawAmt) return;
    await run("VaultManager", "withdraw", [vaultId, Number(withdrawAmt)]);
    setWithdrawAmt("");
    refetch();
  };
  const doMove = async (instrument: string) => {
    const amt = moveAmt[instrument];
    if (!amt) return;
    await run("VaultManager", MOVE_METHODS[instrument], [vaultId, Number(amt)]);
    setMoveAmt((m) => ({ ...m, [instrument]: "" }));
    refetch();
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
        <Card><CardLabel>Treasury</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.treasury.toLocaleString()} cGEN</p></Card>
        <Card><CardLabel>Risk tolerance</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.risk_tolerance}/10</p></Card>
        <Card><CardLabel>Deposits</CardLabel><p className="compax-mono text-xl text-text-primary mt-2">{vault.deposit_count}</p></Card>
      </div>

      <Card className="mb-8">
        <CardLabel>Mandate</CardLabel>
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

      {isOwner && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardLabel>Deposit / withdraw</CardLabel>
            <div className="mt-3 space-y-3">
              <div className="flex gap-2">
                <Input type="number" min={1} value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Deposit amount" />
                <Button onClick={doDeposit} disabled={!depositAmt || state.phase === "deliberating"}>Deposit</Button>
              </div>
              <div className="flex gap-2">
                <Input type="number" min={1} max={vault.treasury} value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} placeholder="Withdraw amount" />
                <Button variant="secondary" onClick={doWithdraw} disabled={!withdrawAmt || state.phase === "deliberating"}>Withdraw</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardLabel>Move capital to an instrument</CardLabel>
            <p className="text-xs text-text-muted mt-2 mb-3">
              Releases mandate-approved capital to your own wallet, so you can create the real escrow, market, or
              credit line as a separate transaction.
            </p>
            <div className="space-y-3">
              {(["escrow", "prediction", "credit"] as const).map((instrument) => {
                const allowed = vault.allowed_instruments.includes(instrument);
                return (
                  <div key={instrument} className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min={1}
                      value={moveAmt[instrument] ?? ""}
                      onChange={(e) => setMoveAmt((m) => ({ ...m, [instrument]: e.target.value }))}
                      placeholder={`${instrument} amount`}
                      disabled={!allowed}
                    />
                    <Button
                      size="sm"
                      variant={allowed ? "secondary" : "ghost"}
                      disabled={!allowed || !moveAmt[instrument] || state.phase === "deliberating"}
                      onClick={() => doMove(instrument)}
                      title={!allowed ? "This vault's mandate doesn't permit this instrument" : undefined}
                    >
                      {allowed ? "Move" : "Not permitted"}
                    </Button>
                  </div>
                );
              })}
            </div>
            <Link href={INSTRUMENT_ROUTES.escrow} className="block text-[11px] text-accent-hover hover:underline mt-3">
              After moving capital, create the instrument here →
            </Link>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
