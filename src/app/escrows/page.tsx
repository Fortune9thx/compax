"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonGrid, ErrorBanner } from "@/components/ui/States";
import { useAllEscrows } from "@/hooks/useContract";

export default function EscrowsPage() {
  const { data: escrows, loading, error, refetch } = useAllEscrows(0, 100);
  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const sorted = [...escrows].reverse();

  return (
    <AppShell degraded={degraded}>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="compax-serif text-3xl text-text-primary">Performance escrows</h1>
          <p className="text-sm text-text-muted mt-1.5">
            Capital locked against natural-language success criteria, released by validator consensus.
          </p>
        </div>
        <Link href="/escrows/create">
          <Button>
            <Plus size={15} /> New escrow
          </Button>
        </Link>
      </header>

      {error && !degraded && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && sorted.length === 0 ? (
        <SkeletonGrid count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No escrows yet"
          description="Lock capital against a success criteria and name a provider to create the first one."
          action={
            <Link href="/escrows/create">
              <Button size="sm">Create an escrow</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((e) => (
            <Link key={e.id} href={`/escrows/${e.id}`}>
              <Card className="h-full hover:border-text-muted transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>{e.id}</CardLabel>
                  <StatusBadge status={e.status} />
                </div>
                <p className="text-sm text-text-primary leading-relaxed line-clamp-3 mb-4">{e.criteria}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="compax-mono text-text-secondary">{e.amount.toLocaleString()} cGEN</span>
                  {e.status === "resolved" && e.outcome && <StatusBadge status={e.outcome} />}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
