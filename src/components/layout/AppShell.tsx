"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Vault,
  ShieldCheck,
  TrendingUp,
  Landmark,
  Award,
  History as HistoryIcon,
  Settings,
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useReputationScore } from "@/hooks/useContract";
import { NETWORK } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { DegradedBanner } from "@/components/ui/States";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vaults", label: "Vaults", icon: Vault },
  { href: "/escrows", label: "Escrows", icon: ShieldCheck },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/credit", label: "Credit", icon: Landmark },
  { href: "/reputation", label: "Reputation", icon: Award },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" className="fill-accent" />
        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-semibold text-text-primary text-[15px] group-hover:text-accent-hover transition-colors">
        Compax
      </span>
    </Link>
  );
}

function NetworkPill() {
  return (
    <span className="status-pill status-active hidden sm:inline-flex">
      {NETWORK.name}
    </span>
  );
}

function WalletControl() {
  const { address, connected, connecting, wallets, walletName, connect, disconnect, error } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;
  const { data: score } = useReputationScore(address || "");

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  if (connected && short) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="status-pill status-neutral compax-mono hidden md:inline-flex"
          title="Reputation score"
        >
          REP {Math.round(score.total_score)}
        </span>
        <button
          onClick={disconnect}
          title={`Disconnect ${walletName ?? "wallet"}`}
          className="compax-mono text-xs px-3 py-2 rounded-lg border border-border bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          {short}
        </button>
      </div>
    );
  }

  const onClickConnect = () => {
    if (wallets.length > 1) setMenuOpen((v) => !v);
    else connect(wallets[0]?.uuid);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={onClickConnect}
        disabled={connecting}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {error && !menuOpen && (
        <div className="compax-mono absolute top-full right-0 mt-1.5 text-[10px] text-danger max-w-[220px] text-right">
          {error}
        </div>
      )}
      {menuOpen && (
        <div className="compax-card-elevated absolute top-full right-0 mt-2 min-w-[200px] py-1.5 z-50">
          <div className="compax-mono text-[10px] uppercase tracking-wider text-text-muted px-3 py-1.5">
            Choose a wallet
          </div>
          {wallets.map((w) => (
            <button
              key={w.uuid}
              onClick={() => { setMenuOpen(false); connect(w.uuid); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated transition-colors text-left"
            >
              {w.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.icon} alt="" width={16} height={16} className="rounded flex-none" />
              ) : (
                <span className="h-4 w-4 rounded bg-bg-elevated flex-none" />
              )}
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children, degraded }: { children: React.ReactNode; degraded?: boolean }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-56 flex-none border-r border-border bg-bg-secondary/60 px-4 py-5">
        <div className="mb-8 px-1">
          <Logo />
        </div>
        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-accent/12 text-accent-hover font-medium"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
                )}
              >
                <Icon size={16} className="flex-none" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-1 pt-4 border-t border-border/60">
          <NetworkPill />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* top rail */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border bg-bg-secondary/40 backdrop-blur sticky top-0 z-30">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <NetworkPill />
            </div>
            <WalletControl />
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1280px] w-full mx-auto page-enter pb-24 md:pb-8">
          {degraded && <DegradedBanner />}
          {children}
        </main>

        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-secondary/95 backdrop-blur border-t border-border flex overflow-x-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-3.5 flex-1 min-w-[64px] text-[10px]",
                  active ? "text-accent-hover" : "text-text-muted"
                )}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
