"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell degraded>
      <div className="flex flex-col items-start gap-4 pt-16">
        <span className="compax-mono text-xs text-danger">ERROR</span>
        <p className="text-text-secondary">Something went wrong reading chain state.</p>
        <Button size="sm" onClick={reset}>Try again</Button>
      </div>
    </AppShell>
  );
}
