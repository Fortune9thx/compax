"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/compax/AppShell";

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
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", paddingTop: 40 }}>
        <span className="ce-mono" style={{ fontSize: 11, color: "var(--clay)" }}>ERROR</span>
        <span style={{ fontSize: 16, color: "var(--muted)" }}>Something went wrong reading chain state.</span>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ce-btn" onClick={reset}>Try again</button>
        </div>
      </div>
    </AppShell>
  );
}
