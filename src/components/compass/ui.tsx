/* ─── Compass shared UI primitives (post-reset design system) ─── */
"use client";

export const SANS = "var(--font-sans), 'IBM Plex Sans', sans-serif";
export const MONO = "var(--font-mono), 'IBM Plex Mono', monospace";
export const SERIF = "var(--font-serif), 'Newsreader', serif";

export const GR = { bg: "rgba(111,191,143,.15)", fg: "#6fbf8f", border: "rgba(111,191,143,.3)" };
export const OR = { bg: "rgba(214,146,106,.15)", fg: "#d6926a", border: "rgba(214,146,106,.3)" };
export const CYC = { bg: "rgba(127,212,212,.15)", fg: "#7fd4d4", border: "rgba(127,212,212,.3)" };

export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34">
      <path d="M17 4 L21.5 17 L17 30 L12.5 17 Z" fill="#7fd4d4" />
      <circle cx="17" cy="17" r="15.5" fill="none" stroke="rgba(236,235,230,.3)" strokeWidth="1.4" />
    </svg>
  );
}

import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";

const NAV_LINKS = [
  { label: "Overview", href: "/ecosystem" },
  { label: "Vaults", href: "/vaults" },
  { label: "Lending", href: "/lending" },
  { label: "Builders", href: "/builders" },
  { label: "Predictions", href: "/predictions" },
  { label: "Reputation", href: "/reputation" },
];

function WalletButton() {
  const { address, connected, connecting, connect, disconnect } = useWallet();
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  if (connected && short) {
    return (
      <button
        onClick={disconnect}
        title="Click to disconnect"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          font: `500 11px ${MONO}`, color: "#6fbf8f",
          background: "rgba(111,191,143,.1)", border: "1px solid rgba(111,191,143,.3)",
          borderRadius: 6, padding: "5px 12px", cursor: "pointer",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6fbf8f", animation: "cePulse 2s infinite", flexShrink: 0 }} />
        {short}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={connecting}
      style={{
        font: `500 11px ${MONO}`, color: "#7fd4d4",
        background: "rgba(127,212,212,.1)", border: "1px solid rgba(127,212,212,.3)",
        borderRadius: 6, padding: "5px 12px", cursor: connecting ? "not-allowed" : "pointer",
        opacity: connecting ? 0.6 : 1,
      }}
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

/** Shared sticky app nav: logo, breadcrumb tag, section links, wallet, live status. */
export function AppNav({
  tag,
  active,
  status = "● SYSTEM LIVE",
}: {
  tag: string;
  active: string;
  status?: string;
}) {
  return (
    <nav
      style={{
        position: "sticky", top: 0, zIndex: 20,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 40px",
        background: "rgba(7,10,18,.85)", backdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(236,235,230,.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Link href="/" style={{ display: "flex" }}><Logo size={22} /></Link>
        <span style={{ font: `600 15px ${SANS}` }}>COMPASS</span>
        <span style={{ font: `400 11px ${MONO}`, color: "rgba(236,235,230,.4)", borderLeft: "1px solid rgba(236,235,230,.15)", paddingLeft: 11 }}>{tag}</span>
      </div>
      <div style={{ display: "flex", gap: 26, font: `400 13px ${SANS}` }}>
        {NAV_LINKS.map((l) =>
          l.label === active ? (
            <Link key={l.label} href={l.href} style={{ color: "#7fd4d4" }}>{l.label}</Link>
          ) : (
            <Link key={l.label} className="ce-navlink" href={l.href}>{l.label}</Link>
          )
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <WalletButton />
        <span style={{ font: `400 10.5px ${MONO}`, color: "#7fd4d4", animation: "cePulse 2s infinite" }}>{status}</span>
      </div>
    </nav>
  );
}

const TICKER = [
  { text: "◦ 14:02 RATE EVENT DETECTED" },
  { text: "◉ 14:07 MERIDIAN COUNCIL CONVENED", cyan: true },
  { text: "◦ 14:11 HARBOR CONSENSUS 6/7" },
  { text: "◦ 14:14 −12% GROWTH → RESERVES" },
  { text: "◦ 14:32 DECISION №4,182 RECORDED" },
  { text: "◉ 14:40 FRONTIER COUNCIL CONVENED", cyan: true },
];

/** System pulse ticker — on every page. */
export function PulseTicker() {
  return (
    <div style={{ borderBottom: "1px solid rgba(236,235,230,.08)", padding: "10px 0", overflow: "hidden", background: "rgba(15,22,38,.6)" }}>
      <div style={{ display: "inline-flex", gap: 44, whiteSpace: "nowrap", font: `400 11px ${MONO}`, color: "rgba(236,235,230,.55)", animation: "ceDrift 22s linear infinite" }}>
        {[...TICKER, ...TICKER].map((t, i) => (
          <span key={i} style={t.cyan ? { color: "#7fd4d4" } : undefined}>{t.text}</span>
        ))}
      </div>
    </div>
  );
}

/** L1 panel style object */
export const panel: React.CSSProperties = {
  border: "1px solid rgba(236,235,230,.1)",
  borderRadius: 12,
  background: "#0a0f1a",
};

export const monoLabel: React.CSSProperties = {
  font: `400 10px ${MONO}`,
  color: "rgba(236,235,230,.45)",
};

/** Council thinking dots — loading = council thinking. Never spinners. */
export function ThinkingDots({ size = 4 }: { size?: number }) {
  const dot = (delay: string) => ({
    width: size,
    height: size,
    borderRadius: "50%",
    background: "#7fd4d4",
    animation: `ceTick 1.8s ${delay} infinite`,
  });
  return (
    <span style={{ display: "flex", gap: 4 }}>
      <span style={dot("0s")} />
      <span style={dot(".3s")} />
      <span style={dot(".6s")} />
    </span>
  );
}
