"use client";

import { AppShell } from "@/components/compax/AppShell";
import { PageHead, StatTile, Panel, EmptyState } from "@/components/compax/primitives";
import { TxStatus, useTxStatus } from "@/components/compax/TxStatus";
import { useCanClaimFaucet, useReputation, useContractWrite } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";

export default function FaucetPage() {
  const { address, connected, connect } = useWallet();
  const target = address || "";
  const { data: canClaim, error, refetch } = useCanClaimFaucet(target);
  const { data: score, refetch: refetchScore } = useReputation(target);
  const { execute, loading: claiming } = useContractWrite();
  const { tx, run, reset } = useTxStatus();

  const degraded = !!error && /not found|timeout|unreachable/i.test(error);

  const claim = async () => {
    await run(() => execute("ReputationSystem", "claim_cgen", []));
    refetch();
    refetchScore();
  };

  return (
    <AppShell degraded={degraded}>
      <PageHead
        title="Faucet"
        meta="24h cooldown"
      />

      {!connected ? (
        <Panel style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start", maxWidth: 520 }}>
          <EmptyState>Connect a wallet to claim.</EmptyState>
          <button className="ce-btn" onClick={connect}>Connect wallet</button>
        </Panel>
      ) : (
        <>
          <div className="ce-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 28, maxWidth: 720 }}>
            <StatTile label="Address" value={<span className="ce-mono" style={{ fontSize: 14 }}>{address?.slice(0, 6)}…{address?.slice(-4)}</span>} />
            <StatTile label="Reputation" value={Math.round(score.total_score / 10)} />
            <StatTile label="Eligible" value={canClaim ? "Yes" : "Not yet"} hint={canClaim ? undefined : "24h cooldown"} />
          </div>

          <Panel style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
            <span className="ce-section-label">Claim cGEN faucet</span>
            <p style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--muted)", margin: 0 }}>
              {canClaim
                ? "You're eligible. Claiming writes a cGEN grant to your balance and logs the action on the ReputationSystem contract."
                : "You've claimed recently. The faucet unlocks again 24 hours after your last claim."}
            </p>
            <button className="ce-btn" onClick={claim} disabled={claiming || !canClaim || tx.phase === "deliberating"} style={{ alignSelf: "flex-start" }}>
              {tx.phase === "deliberating" ? "Claiming…" : "Claim cGEN"}
            </button>
            {tx.phase !== "idle" && <TxStatus tx={tx} onDismiss={reset} />}
          </Panel>
        </>
      )}
    </AppShell>
  );
}
