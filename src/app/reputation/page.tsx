"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/States";
import { useReputationScore, useReputationHistory } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score / 10));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const color = score >= 700 ? "var(--success)" : score >= 400 ? "var(--warning)" : "var(--danger)";

  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
      <circle
        cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text x="70" y="64" textAnchor="middle" className="compax-mono" fontSize="26" fill="var(--text-primary)" fontWeight="500">
        {score}
      </text>
      <text x="70" y="84" textAnchor="middle" className="compax-mono" fontSize="9" fill="var(--text-muted)" letterSpacing="1">
        SCORE
      </text>
    </svg>
  );
}

export default function ReputationPage() {
  const { address, connected } = useWallet();
  const [viewAddress, setViewAddress] = useState("");

  useEffect(() => {
    if (connected && address) setViewAddress(address);
  }, [connected, address]);

  const { data: score } = useReputationScore(viewAddress || "0x0");
  const { data: history } = useReputationHistory(viewAddress || "0x0", 0, 100);

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">Reputation passport</h1>
        <p className="text-sm text-text-muted mt-1.5">Score is only ever updated by adjudicated outcomes — fully disputable, never self-reported.</p>
      </header>

      <Input
        value={viewAddress}
        onChange={(e) => setViewAddress(e.target.value)}
        placeholder="0x… — view any address's reputation"
        className="max-w-md mb-8"
      />

      {!viewAddress ? (
        <EmptyState title="Connect a wallet or enter an address" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="flex flex-col items-center justify-center py-8">
            <ScoreRing score={score.total_score} />
            <p className="text-xs text-text-muted mt-4">{score.total_actions} adjudicated actions</p>
          </Card>
          <Card className="lg:col-span-2">
            <CardLabel>Breakdown by category</CardLabel>
            <div className="space-y-4 mt-4">
              {([
                ["Escrow", score.escrow_score],
                ["Prediction", score.prediction_score],
                ["Credit", score.credit_score],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-20 flex-none">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
                    <div
                      className={value >= 0 ? "bg-success h-full" : "bg-danger h-full"}
                      style={{ width: `${Math.min(100, Math.abs(value) / 5)}%` }}
                    />
                  </div>
                  <span className={`compax-mono text-xs w-14 text-right ${value >= 0 ? "text-success" : "text-danger"}`}>
                    {value >= 0 ? "+" : ""}{value}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {viewAddress && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border"><CardLabel>History</CardLabel></div>
          {history.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="divide-y divide-border/60">
              {[...history].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                  <Badge tone="neutral" className="flex-none">{h.category}</Badge>
                  <p className="text-xs text-text-secondary flex-1 leading-relaxed">{h.reason}</p>
                  <span className={`compax-mono text-xs flex-none ${h.delta >= 0 ? "text-success" : "text-danger"}`}>
                    {h.delta >= 0 ? "+" : ""}{h.delta}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
