import Link from "next/link";
import { AppShell } from "@/components/compax/AppShell";

export default function NotFound() {
  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start", paddingTop: 40 }}>
        <span className="ce-mono" style={{ fontSize: 11, color: "var(--faint)" }}>404</span>
        <span style={{ fontSize: 16, color: "var(--muted)" }}>This page doesn&apos;t exist.</span>
        <Link href="/" className="ce-btn">Back to Compax</Link>
      </div>
    </AppShell>
  );
}
