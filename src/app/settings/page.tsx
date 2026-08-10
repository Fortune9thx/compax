"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NETWORK, CONTRACTS } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";

export default function SettingsPage() {
  const { address, connected, walletName, chainId, onBradbury } = useWallet();

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">Settings</h1>
      </header>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardLabel>Network</CardLabel>
          <div className="mt-3 space-y-2 text-xs">
            <Row k="Name" v={NETWORK.name} />
            <Row k="Chain ID" v={String(NETWORK.chainId)} />
            <Row k="RPC" v={NETWORK.rpcUrl} />
            <Row k="Explorer" v={NETWORK.explorerUrl} />
          </div>
        </Card>

        <Card>
          <CardLabel>Wallet</CardLabel>
          <div className="mt-3 space-y-2 text-xs">
            <Row k="Status" v={connected ? "Connected" : "Not connected"} badge={connected ? "success" : "neutral"} />
            {connected && (
              <>
                <Row k="Provider" v={walletName ?? "Unknown"} />
                <Row k="Address" v={address ?? "—"} mono />
                <Row k="Chain" v={chainId ?? "—"} />
                <Row k="On Bradbury" v={onBradbury ? "Yes" : "No"} badge={onBradbury ? "success" : "warning"} />
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardLabel>Deployed contracts</CardLabel>
          <div className="mt-3 space-y-2 text-xs">
            {Object.entries(CONTRACTS).map(([name, addr]) => (
              <Row key={name} k={name} v={addr} mono />
            ))}
          </div>
        </Card>

        <Card>
          <CardLabel>Autonomous keeper</CardLabel>
          <p className="text-xs text-text-secondary leading-relaxed mt-3">
            A registered keeper can trigger <code className="compax-mono text-text-primary">resolve()</code> on
            overdue escrows and markets, or <code className="compax-mono text-text-primary">re_evaluate_mandate()</code> on
            vaults. It never moves funds — it can only ask a contract to reason. Run it with{" "}
            <code className="compax-mono text-text-primary">npm run keeper</code> from a machine holding a
            registered keeper key.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({ k, v, mono, badge }: { k: string; v: string; mono?: boolean; badge?: "success" | "warning" | "neutral" }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <span className="text-text-muted flex-none">{k}</span>
      {badge ? (
        <Badge tone={badge}>{v}</Badge>
      ) : (
        <span className={mono ? "compax-mono text-text-secondary truncate" : "text-text-secondary truncate"}>{v}</span>
      )}
    </div>
  );
}
