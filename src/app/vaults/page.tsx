"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, SkeletonGrid, ErrorBanner } from "@/components/ui/States";
import { useAllVaults } from "@/hooks/useContract";

export default function VaultsPage() {
  const { data: vaults, loading, error, refetch } = useAllVaults(0, 100);
  const degraded = !!error && /not found|timeout|unreachable/i.test(error);
  const sorted = [...vaults].reverse();

  return (
    <AppShell degraded={degraded}>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="compax-serif text-3xl text-text-primary">Mandate vaults</h1>
          <p className="text-sm text-text-muted mt-1.5">
            Multi-party capital pools. Depositors keep individual, withdrawable claims - any capital movement the
            owner makes can be challenged and adjudicated against the stated objective.
          </p>
        </div>
        <Link href="/vaults/create">
          <Button><Plus size={15} /> New vault</Button>
        </Link>
      </header>

      {error && !degraded && <ErrorBanner message={error} onRetry={refetch} />}

      {loading && sorted.length === 0 ? (
        <SkeletonGrid count={4} />
      ) : sorted.length === 0 ? (
        <EmptyState
          title="No vaults yet"
          description="Create a vault, state your objective, and set a risk tolerance - the instruments it can enter follow directly from that."
          action={<Link href="/vaults/create"><Button size="sm">Create a vault</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((v) => (
            <Link key={v.id} href={`/vaults/${v.id}`}>
              <Card className="h-full hover:border-text-muted transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <CardLabel>{v.id}</CardLabel>
                  <span className="compax-mono text-xs text-text-secondary">{v.treasury.toLocaleString()} cGEN</span>
                </div>
                <p className="text-sm font-medium text-text-primary mb-1.5">{v.name}</p>
                <p className="compax-serif text-xs text-text-muted italic leading-relaxed line-clamp-2 mb-3">
                  &ldquo;{v.objective}&rdquo;
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {v.allowed_instruments.map((i) => (
                    <Badge key={i} tone="neutral">{i}</Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
