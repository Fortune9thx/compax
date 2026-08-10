"use client";

import Link from "next/link";
import { ShieldCheck, TrendingUp, Landmark, Vault } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState, SkeletonGrid } from "@/components/ui/States";
import { useAllEscrows, useAllMarkets, useAllCreditLines, useAllVaults } from "@/hooks/useContract";

type Row = { id: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string; status: string; kind: string };

export default function HistoryPage() {
  const { data: escrows, loading: l1 } = useAllEscrows(0, 100);
  const { data: markets, loading: l2 } = useAllMarkets(0, 100);
  const { data: lines, loading: l3 } = useAllCreditLines(0, 100);
  const { data: vaults, loading: l4 } = useAllVaults(0, 100);
  const loading = l1 || l2 || l3 || l4;

  const rows: Row[] = [
    ...escrows.map((e) => ({ id: e.id, href: `/escrows/${e.id}`, icon: ShieldCheck, label: e.criteria, status: e.status, kind: "Escrow" })),
    ...markets.map((m) => ({ id: m.id, href: `/markets/${m.id}`, icon: TrendingUp, label: m.question, status: m.status, kind: "Market" })),
    ...lines.map((l) => ({ id: l.id, href: "/credit", icon: Landmark, label: l.purpose, status: l.status, kind: "Credit" })),
    ...vaults.map((v) => ({ id: v.id, href: `/vaults/${v.id}`, icon: Vault, label: v.name, status: v.status, kind: "Vault" })),
  ].sort((a, b) => {
    const na = parseInt(a.id.split("-")[1] || "0", 10);
    const nb = parseInt(b.id.split("-")[1] || "0", 10);
    return nb - na;
  });

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">History</h1>
        <p className="text-sm text-text-muted mt-1.5">Every mandate, escrow, market, and credit line — across all contracts.</p>
      </header>

      {loading && rows.length === 0 ? (
        <SkeletonGrid count={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No activity yet" />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-border/60">
            {rows.map((r) => (
              <Link key={`${r.kind}-${r.id}`} href={r.href} className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-elevated/50 transition-colors">
                <r.icon size={15} className="text-text-muted flex-none" />
                <CardLabel className="w-16 flex-none">{r.kind}</CardLabel>
                <span className="text-sm text-text-secondary flex-1 truncate">{r.label}</span>
                <StatusBadge status={r.status} className="flex-none" />
              </Link>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  );
}
