/* ─── AppShell — rail + content ──────────────────────────────────────────
   Rail (232px) collapses to a top bar under 880px. The wordmark IS the
   Engine's treasury core — the machined square-round form, not a separate
   logo. Network state lives in the rail footer; the degraded banner is
   designed in, not bolted on.
──────────────────────────────────────────────────────────────────────── */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWallet } from "@/hooks/useWallet";

/** The mark: four allocation lanes on an angled plane — the same four-sector
    readout as EngineFingerprint, compressed to wordmark scale. */
export function EngineMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <polygon points="5,20 25,12 29,19 9,27" fill="var(--surface)" stroke="var(--line)" strokeWidth="1" />
      <g stroke="var(--primary)" strokeLinecap="butt">
        <line x1="6.3" y1="20.9" x2="26.3" y2="12.9" strokeWidth="1.5" opacity="0.55" />
        <line x1="6.8" y1="22.6" x2="26.8" y2="14.6" strokeWidth="2.4" opacity="0.95" />
        <line x1="7.3" y1="24.4" x2="27.3" y2="16.4" strokeWidth="1.2" opacity="0.5" />
        <line x1="7.8" y1="26.1" x2="27.8" y2="18.1" strokeWidth="1.8" opacity="0.75" />
      </g>
    </svg>
  );
}

const NAV = [
  { n: "01", label: "Overview", href: "/ecosystem" },
  { n: "02", label: "Vaults", href: "/vaults" },
  { n: "03", label: "Lending", href: "/lending" },
  { n: "04", label: "Builders", href: "/builders" },
  { n: "05", label: "Predictions", href: "/predictions" },
  { n: "06", label: "Staking", href: "/staking" },
  { n: "07", label: "Reputation", href: "/reputation" },
  { n: "08", label: "Faucet", href: "/faucet" },
];

function RailWallet() {
  const { address, connected, connecting, wallets, walletName, connect, disconnect, error } = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

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
      <button onClick={disconnect} title={`Disconnect ${walletName ?? "wallet"}`} className="ce-rail-wallet ce-connected">
        <span className="ce-dot" />
        {short}
      </button>
    );
  }

  const onClickConnect = () => {
    if (wallets.length > 1) {
      setMenuOpen((v) => !v);
    } else {
      connect(wallets[0]?.uuid);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button onClick={onClickConnect} disabled={connecting} className="ce-rail-wallet">
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {error && !menuOpen && (
        <div className="ce-mono" style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, fontSize: 10.5, color: "var(--clay)", maxWidth: 220, textAlign: "right" }}>
          {error}
        </div>
      )}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            minWidth: 200,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <div className="ce-section-label" style={{ padding: "10px 14px 6px" }}>Choose a wallet</div>
          {wallets.map((w) => (
            <button
              key={w.uuid}
              onClick={() => { setMenuOpen(false); connect(w.uuid); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "10px 14px",
                background: "transparent",
                border: "none",
                borderTop: "1px solid var(--line-soft)",
                color: "var(--text)",
                fontSize: 13,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {w.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={w.icon} alt="" width={18} height={18} style={{ borderRadius: 4, flex: "none" }} />
              ) : (
                <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--raised)", flex: "none" }} />
              )}
              {w.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Network state — honest about the connection. `degraded` shows stale-data mode. */
export function NetworkState({ degraded = false }: { degraded?: boolean }) {
  return (
    <div className="ce-netstate">
      <span className={`ce-dot ${degraded ? "ce-dot-amber" : ""}`} />
      <div>
        <div className="ce-net-name">{degraded ? "Bradbury · syncing" : "Bradbury Testnet"}</div>
        <div className="ce-net-meta">chainId 4221</div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  degraded = false,
}: {
  children: React.ReactNode;
  degraded?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="ce-shell">
      <aside className="ce-rail">
        <div className="ce-rail-top">
          <Link href="/" className="ce-rail-mark">
            <EngineMark size={18} />
            <span>Compax</span>
          </Link>
          <div className="ce-rail-metaline">Autonomous capital · onchain</div>

          <nav className="ce-rail-nav">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "ce-nav-active" : undefined}
                >
                  <span>{item.n}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ce-rail-foot">
          <RailWallet />
          <NetworkState degraded={degraded} />
        </div>
      </aside>

      <main className="ce-main">
        {degraded && (
          <div className="ce-degraded-banner" role="status">
            <span className="ce-dot ce-dot-amber" />
            Bradbury read layer unreachable — showing last-known state. Values may
            be stale until the node resyncs.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
