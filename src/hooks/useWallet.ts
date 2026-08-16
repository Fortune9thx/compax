"use client";

import { useState, useEffect, useCallback } from "react";
import { getWallets, subscribeWallets, type DiscoveredWallet, type EIP1193Provider } from "@/lib/walletProviders";

const BRADBURY_CHAIN = {
  chainId: "0x107D", // 4221 in hex
  chainName: "GenLayer Bradbury Testnet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://rpc-bradbury.genlayer.com"],
  blockExplorerUrls: ["https://explorer-bradbury.genlayer.com/"],
};

export type WalletState = {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  chainId: string | null;
  onBradbury: boolean;
  walletName: string | null;
  provider: EIP1193Provider | null;
};

const DEFAULT: WalletState = {
  address: null,
  connected: false,
  connecting: false,
  error: null,
  chainId: null,
  onBradbury: false,
  walletName: null,
  provider: null,
};

// Singleton wallet state - shared across all hook instances (exported for useContractWrite)
export let _state: WalletState = DEFAULT;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function setState(patch: Partial<WalletState>) {
  _state = { ..._state, ...patch };
  notify();
}

// Event listeners are attached to whichever provider the user actually picked,
// not blindly to window.ethereum - otherwise a second injected wallet's events
// never reach the app.
let _listenerCleanup: (() => void) | null = null;

function attachProviderListeners(provider: EIP1193Provider) {
  _listenerCleanup?.();

  const onAccountsChanged = (accounts: unknown) => {
    const accs = accounts as string[];
    if (!accs || accs.length === 0) {
      setState({ ...DEFAULT });
    } else {
      setState({ address: accs[0], connected: true });
    }
  };

  const onChainChanged = (chainId: unknown) => {
    const id = chainId as string;
    setState({ chainId: id, onBradbury: id === BRADBURY_CHAIN.chainId });
  };

  provider.on("accountsChanged", onAccountsChanged);
  provider.on("chainChanged", onChainChanged);
  _listenerCleanup = () => {
    provider.removeListener("accountsChanged", onAccountsChanged);
    provider.removeListener("chainChanged", onChainChanged);
  };
}

async function switchToBradbury(provider: EIP1193Provider) {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BRADBURY_CHAIN.chainId }],
    });
  } catch (switchError: unknown) {
    if ((switchError as { code?: number }).code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [BRADBURY_CHAIN],
      });
    } else {
      throw switchError;
    }
  }
}

const LAST_WALLET_KEY = "compax:lastWalletRdns";
let _restoreAttempted = false;

async function tryRestoreSession(wallets: DiscoveredWallet[]) {
  if (_restoreAttempted || _state.connected || typeof window === "undefined") return;
  const lastRdns = window.localStorage.getItem(LAST_WALLET_KEY);
  if (!lastRdns) return;
  const match = wallets.find((w) => w.rdns === lastRdns);
  if (!match) return;
  _restoreAttempted = true;

  try {
    const accounts = (await match.provider.request({ method: "eth_accounts" })) as string[];
    if (!accounts || accounts.length === 0) return;
    const chainId = (await match.provider.request({ method: "eth_chainId" })) as string;
    attachProviderListeners(match.provider);
    setState({
      address: accounts[0],
      connected: true,
      chainId,
      onBradbury: chainId === BRADBURY_CHAIN.chainId,
      walletName: match.name,
      provider: match.provider,
    });
  } catch {
    // silent - user will just see "Connect wallet"
  }
}

export function useWallet() {
  const [, forceUpdate] = useState(0);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    _listeners.add(update);

    const unsubscribe = subscribeWallets(() => {
      const list = getWallets();
      setWallets(list);
      tryRestoreSession(list);
    });
    const initial = getWallets();
    setWallets(initial);
    tryRestoreSession(initial);

    return () => {
      _listeners.delete(update);
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async (uuid?: string) => {
    const available = getWallets();
    if (available.length === 0) {
      setState({ error: "No EVM wallet detected. Install MetaMask, Rabby, Coinbase Wallet, or another browser wallet." });
      return;
    }
    const chosen = uuid ? available.find((w) => w.uuid === uuid) : available[0];
    if (!chosen) {
      setState({ error: "Selected wallet is no longer available." });
      return;
    }

    setState({ connecting: true, error: null });
    try {
      const accounts = (await chosen.provider.request({ method: "eth_requestAccounts" })) as string[];
      await switchToBradbury(chosen.provider);
      const chainId = (await chosen.provider.request({ method: "eth_chainId" })) as string;

      attachProviderListeners(chosen.provider);
      if (typeof window !== "undefined") window.localStorage.setItem(LAST_WALLET_KEY, chosen.rdns);
      setState({
        address: accounts[0],
        connected: true,
        connecting: false,
        chainId,
        onBradbury: chainId === BRADBURY_CHAIN.chainId,
        walletName: chosen.name,
        provider: chosen.provider,
        error: null,
      });
    } catch (e) {
      setState({
        connecting: false,
        error: e instanceof Error ? e.message : "Connection failed",
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    _listenerCleanup?.();
    _listenerCleanup = null;
    if (typeof window !== "undefined") window.localStorage.removeItem(LAST_WALLET_KEY);
    setState({ ...DEFAULT });
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!_state.provider) return;
    try {
      await switchToBradbury(_state.provider);
      const chainId = (await _state.provider.request({ method: "eth_chainId" })) as string;
      setState({ chainId, onBradbury: chainId === BRADBURY_CHAIN.chainId });
    } catch (e) {
      setState({ error: e instanceof Error ? e.message : "Failed to switch network" });
    }
  }, []);

  return { ..._state, wallets, connect, disconnect, switchNetwork };
}
