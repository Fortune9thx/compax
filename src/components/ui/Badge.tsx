import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "active" | "success" | "warning" | "danger" | "deliberating";

const LABELS: Record<string, { tone: StatusTone; label: string }> = {
  // escrow
  open: { tone: "neutral", label: "Open" },
  accepted: { tone: "active", label: "Accepted" },
  evidence_submitted: { tone: "active", label: "Evidence In" },
  challenged: { tone: "warning", label: "Challenged" },
  resolved: { tone: "success", label: "Resolved" },
  // market
  active: { tone: "active", label: "Active" },
  proposed: { tone: "warning", label: "Proposed" },
  // vault
  // credit
  funded: { tone: "active", label: "Funded" },
  repaid: { tone: "success", label: "Repaid" },
  default_claimed: { tone: "danger", label: "Default Claimed" },
  disputed: { tone: "warning", label: "Disputed" },
  // outcomes
  full_release: { tone: "success", label: "Full Release" },
  partial: { tone: "warning", label: "Partial" },
  clawback: { tone: "danger", label: "Clawback" },
  yes: { tone: "success", label: "Yes" },
  no: { tone: "danger", label: "No" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = LABELS[status] ?? { tone: "neutral" as StatusTone, label: status || "Unknown" };
  return (
    <span className={cn("status-pill", `status-${entry.tone}`, className)}>
      {entry.label}
    </span>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: StatusTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("status-pill", `status-${tone}`, className)}>{children}</span>;
}
