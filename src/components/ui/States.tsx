import { Inbox, AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <Icon size={28} className="text-text-muted mb-4" />
      <p className="text-sm text-text-secondary mb-1">{title}</p>
      {description && <p className="text-xs text-text-muted max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-danger/25 bg-danger/8 px-4 py-3 text-sm text-danger">
      <AlertTriangle size={16} className="flex-none" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="text-danger hover:bg-danger/15">
          Retry
        </Button>
      )}
    </div>
  );
}

export function DegradedBanner() {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-warning/25 bg-warning/8 px-4 py-2.5 text-xs text-warning mb-6">
      <WifiOff size={14} className="flex-none" />
      <span>Bradbury reads are syncing - some data may be stale. Writes still work normally.</span>
    </div>
  );
}

export function WrongNetworkBanner({ onSwitch }: { onSwitch?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-danger/25 bg-danger/8 px-4 py-2.5 text-xs text-danger mb-6">
      <AlertTriangle size={14} className="flex-none" />
      <span className="flex-1">
        Your wallet is connected to the wrong network. Compax only works on GenLayer Bradbury Testnet (chainId 4221) - switch networks before submitting any transaction.
      </span>
      {onSwitch && (
        <Button size="sm" variant="ghost" onClick={onSwitch} className="text-danger hover:bg-danger/15 flex-none">
          Switch network
        </Button>
      )}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("compax-card p-5 animate-pulse", className)}>
      <div className="h-3 w-24 bg-bg-elevated rounded mb-4" />
      <div className="h-4 w-full bg-bg-elevated rounded mb-2" />
      <div className="h-4 w-2/3 bg-bg-elevated rounded mb-4" />
      <div className="h-2 w-full bg-bg-elevated rounded" />
    </div>
  );
}

export function SkeletonGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
