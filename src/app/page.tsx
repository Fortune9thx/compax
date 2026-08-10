"use client";

import Link from "next/link";
import { ShieldCheck, TrendingUp, Landmark, Vault, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, SkeletonGrid } from "@/components/ui/States";
import {
  useEscrowCount,
  useMarketCount,
  useCreditLineCount,
  useVaultCount,
  useAllEscrows,
  useAllMarkets,
  useAllCreditLines,
  useTotalVolume,
} from "@/hooks/useContract";

function StatTile({ icon: Icon, label, value, href }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; href: string }) {
  return (
    <Link href={href}>
      <Card className="hover:border-text-muted transition-colors group">
        <div className="flex items-start justify-between">
          <Icon size={17} className="text-accent" />
          <ArrowUpRight size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="compax-mono text-2xl font-medium text-text-primary mt-4">{value}</p>
        <p className="text-xs text-text-muted mt-1">{label}</p>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: escrowCount } = useEscrowCount();
  const { data: marketCount } = useMarketCount();
  const { data: lineCount } = useCreditLineCount();
  const { data: vaultCount } = useVaultCount();
  const { data: volume } = useTotalVolume();
  const { data: escrows, loading: escrowsLoading } = useAllEscrows(0, 5);
  const { data: markets } = useAllMarkets(0, 5);
  const { data: lines } = useAllCreditLines(0, 5);

  const recentEscrows = [...escrows].reverse().slice(0, 4);
  const recentMarkets = [...markets].reverse().slice(0, 4);
  const recentLines = [...lines].reverse().slice(0, 4);
  const hasActivity = recentEscrows.length > 0 || recentMarkets.length > 0 || recentLines.length > 0;

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">Capital under adjudication</h1>
        <p className="text-sm text-text-muted mt-1.5">
          Every number below is live onchain state from GenLayer Bradbury — nothing here is placeholder data.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatTile icon={ShieldCheck} label={`Escrow${escrowCount === 1 ? "" : "s"} adjudicated`} value={escrowCount} href="/escrows" />
        <StatTile icon={TrendingUp} label="Prediction volume" value={volume.toLocaleString()} href="/markets" />
        <StatTile icon={Landmark} label={`Credit line${lineCount === 1 ? "" : "s"}`} value={lineCount} href="/credit" />
        <StatTile icon={Vault} label={`Mandate vault${vaultCount === 1 ? "" : "s"}`} value={vaultCount} href="/vaults" />
      </div>

      {escrowsLoading && !hasActivity ? (
        <SkeletonGrid count={3} />
      ) : !hasActivity ? (
        <EmptyState
          title="No activity yet"
          description="Create a vault, open an escrow, or launch a prediction market to see it here."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <ActivityColumn title="Escrows" href="/escrows">
            {recentEscrows.map((e) => (
              <Link key={e.id} href={`/escrows/${e.id}`} className="block py-2.5 border-b border-border/60 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary truncate">{e.criteria}</span>
                  <StatusBadge status={e.status} className="flex-none" />
                </div>
              </Link>
            ))}
          </ActivityColumn>
          <ActivityColumn title="Markets" href="/markets">
            {recentMarkets.map((m) => (
              <Link key={m.id} href={`/markets/${m.id}`} className="block py-2.5 border-b border-border/60 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary truncate">{m.question}</span>
                  <StatusBadge status={m.status} className="flex-none" />
                </div>
              </Link>
            ))}
          </ActivityColumn>
          <ActivityColumn title="Credit lines" href="/credit">
            {recentLines.map((l) => (
              <div key={l.id} className="py-2.5 border-b border-border/60 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-text-secondary truncate">{l.purpose}</span>
                  <StatusBadge status={l.status} className="flex-none" />
                </div>
              </div>
            ))}
          </ActivityColumn>
        </div>
      )}
    </AppShell>
  );
}

function ActivityColumn({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <CardLabel>{title}</CardLabel>
        <Link href={href} className="text-[11px] text-accent-hover hover:underline">
          View all
        </Link>
      </div>
      <div className="px-5">
        {children || <p className="text-xs text-text-muted py-4">Nothing here yet.</p>}
      </div>
    </Card>
  );
}
