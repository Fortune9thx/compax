"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonGrid, ErrorBanner } from "@/components/ui/States";
import { useAllMarkets } from "@/hooks/useContract";

export default function MarketsPage() {
  const { data: markets, loading, error, refetch } = useAllMarkets(0, 100);
  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const sorted = [...markets].reverse();

  return (
    <AppShell degraded={degraded}>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="compax-serif text-3xl text-text-primary">Contested prediction markets</h1>
          <p className="text-sm text-text-muted mt-1.5">
            Anyone proposes an outcome; anyone can challenge; validators decide independently.
          </p>
        </div>
        <Link href="/markets/create">
          <Button><Plus size={15} /> New market</Button>
        </Link>
      </header>

      {error && !degraded && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && sorted.length === 0 ? (
        <SkeletonGrid count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No markets yet"
          description="Ask a binary question and let the market decide."
          action={<Link href="/markets/create"><Button size="sm">Create a market</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((m) => {
            const total = m.total_yes + m.total_no;
            const yesPct = total > 0 ? Math.round((m.total_yes / total) * 100) : 50;
            return (
              <Link key={m.id} href={`/markets/${m.id}`}>
                <Card className="h-full hover:border-text-muted transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <CardLabel>{m.id}</CardLabel>
                    <StatusBadge status={m.status} />
                  </div>
                  <p className="text-sm text-text-primary leading-relaxed line-clamp-3 mb-4">{m.question}</p>
                  <div className="h-1.5 rounded-full overflow-hidden bg-bg-elevated flex">
                    <div className="bg-success h-full" style={{ width: `${yesPct}%` }} />
                    <div className="bg-danger h-full" style={{ width: `${100 - yesPct}%` }} />
                  </div>
                  <div className="flex justify-between compax-mono text-[10px] mt-1.5">
                    <span className="text-success">YES {yesPct}%</span>
                    <span className="text-danger">NO {100 - yesPct}%</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
