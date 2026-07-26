"use client";

import { useState, useEffect, useCallback } from "react";

const BRADBURY_CHAIN = {
  chainId: "0x107D",  // 4221 in hex
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
};

const DEFAULT: WalletState = {
  address: null,
  connected: false,
  connecting: false,
  error: null,
  chainId: null,
  onBradbury: false,
};

// Singleton wallet state — shared across all hook instances
let _state: WalletState = DEFAULT;
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach((fn) => fn());
}

function setState(patch: Partial<WalletState>) {
  _state = { ..._state, ...patch };
  notify();
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

// Wire up MetaMask event listeners once
let _listenersAttached = false;
function attachMetaMaskListeners() {
  if (_listenersAttached || typeof window === "undefined" || !window.ethereum) return;
  _listenersAttached = true;

  const onAccountsChanged = (accounts: unknown) => {
    const accs = accounts as string[];
    if (!accs || accs.length === 0) {
      setState({ address: null, connected: false });
    } else {
      setState({ address: accs[0], connected: true });
    }
  };

  const onChainChanged = (chainId: unknown) => {
    const id = chainId as string;
    setState({ chainId: id, onBradbury: id === BRADBURY_CHAIN.chainId });
  };

  window.ethereum.on("accountsChanged", onAccountsChanged);
  window.ethereum.on("chainChanged", onChainChanged);
}

export function useWallet() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    _listeners.add(update);
    attachMetaMaskListeners();

    // Restore session if already connected
    if (!_state.connected && typeof window !== "undefined" && window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const accs = accounts as string[];
          if (accs && accs.length > 0) {
            window.ethereum!.request({ method: "eth_chainId" }).then((chainId) => {
              const id = chainId as string;
              setState({
                address: accs[0],
                connected: true,
                chainId: id,
                onBradbury: id === BRADBURY_CHAIN.chainId,
              });
            });
          }
        })
        .catch(() => {});
    }

    return () => { _listeners.delete(update); };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setState({ error: "MetaMask not detected. Install MetaMask to connect." });
      return;
    }
    setState({ connecting: true, error: null });
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];

      // Switch to or add Bradbury network
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BRADBURY_CHAIN.chainId }],
        });
      } catch (switchError: unknown) {
        // Chain not added yet — add it
        if ((switchError as { code?: number }).code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [BRADBURY_CHAIN],
          });
        } else {
          throw switchError;
        }
      }

      const chainId = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setState({
        address: accounts[0],
        connected: true,
        connecting: false,
        chainId,
        onBradbury: chainId === BRADBURY_CHAIN.chainId,
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
    setState({ ...DEFAULT });
  }, []);

  return { ..._state, connect, disconnect };
}
