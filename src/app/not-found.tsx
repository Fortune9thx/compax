import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <AppShell>
      <div className="flex flex-col items-start gap-4 pt-16">
        <span className="compax-mono text-xs text-text-muted">404</span>
        <p className="text-text-secondary">This page doesn&apos;t exist.</p>
        <Link href="/">
          <Button size="sm">Back to Compax</Button>
        </Link>
      </div>
    </AppShell>
  );
}
