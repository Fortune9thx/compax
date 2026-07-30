"use client";

/* EIP-6963 multi-injected-provider discovery. Falls back to window.ethereum
   (and window.ethereum.providers, the older multi-wallet convention) for
   wallets that don't yet announce via EIP-6963. */

export type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
};

export type DiscoveredWallet = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  provider: EIP1193Provider;
};

type EIP6963ProviderDetail = {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EIP1193Provider;
};

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
  interface Window {
    ethereum?: EIP1193Provider & { providers?: EIP1193Provider[] };
  }
}

const _discovered = new Map<string, DiscoveredWallet>();
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

let _initialized = false;

function init() {
  if (_initialized || typeof window === "undefined") return;
  _initialized = true;

  window.addEventListener("eip6963:announceProvider", (event) => {
    const { info, provider } = event.detail;
    if (_discovered.has(info.uuid)) return;
    _discovered.set(info.uuid, { uuid: info.uuid, name: info.name, icon: info.icon, rdns: info.rdns, provider });
    notify();
  });

  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/** Legacy fallback for wallets that only set window.ethereum (no EIP-6963 announcement yet). */
function legacyProviders(): DiscoveredWallet[] {
  if (typeof window === "undefined" || !window.ethereum) return [];
  const injected = window.ethereum.providers?.length ? window.ethereum.providers : [window.ethereum];
  return injected.map((p, i) => ({
    uuid: `legacy-${i}`,
    name: p.isMetaMask ? "MetaMask" : "Injected Wallet",
    icon: "",
    rdns: `legacy.${i}`,
    provider: p,
  }));
}

export function subscribeWallets(cb: () => void): () => void {
  init();
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** EIP-6963 discovered wallets, falling back to legacy window.ethereum if none announced. */
export function getWallets(): DiscoveredWallet[] {
  init();
  if (_discovered.size > 0) return Array.from(_discovered.values());
  return legacyProviders();
}
