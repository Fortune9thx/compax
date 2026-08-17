import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus, CalldataEncodable } from "genlayer-js/types";

// ─── Read client - shared singleton, no wallet needed ───
const _readClient = createClient({ chain: testnetBradbury });

export async function readContract<T = unknown>(
  contractAddress: string,
  functionName: string,
  args: CalldataEncodable[] = []
): Promise<T> {
  return _readClient.readContract({
    address: contractAddress as `0x${string}`,
    functionName,
    args,
  }) as Promise<T>;
}

// ─── Provider hardening (from OSSure - Bradbury production pattern) ───
// Non-MetaMask wallets reject MetaMask Snap probe methods and abort transactions.
// We intercept those probes and return empty objects so signing continues cleanly.
const SNAP_PROBE_METHODS = new Set([
  "wallet_getSnaps",
  "wallet_requestSnaps",
  "wallet_invokeSnap",
  "wallet_snap",
]);

function hardenProvider(provider: unknown): unknown {
  if (!provider || typeof (provider as { request?: unknown }).request !== "function") return provider;
  const originalRequest = (provider as { request: (a: unknown) => Promise<unknown> }).request.bind(provider);
  return new Proxy(provider as object, {
    get(target, prop, receiver) {
      if (prop === "request") {
        return async (args: { method: string }) => {
          if (args && SNAP_PROBE_METHODS.has(args.method)) return {};
          return originalRequest(args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

// ─── Write client - MetaMask signs via EIP-1193 provider (Bradbury pattern) ───
async function getWriteClient(provider: unknown, address: string) {
  // Do NOT call client.connect() here - inside genlayer-js that function talks
  // to the global window.ethereum directly (bypassing the provider we just
  // configured above) and throws a hardcoded "MetaMask is not installed."
  // for any wallet that doesn't also register itself as window.ethereum
  // (e.g. OKX in a multi-wallet setup). chain is already set via the option
  // above, and useWallet.ts already did the real eth_requestAccounts/
  // chain-switch handshake against this exact provider.
  return createClient({
    chain: testnetBradbury,
    account: address as `0x${string}`,
    provider: hardenProvider(provider) as never,
  });
}

export async function writeContract(
  address: string,
  contractAddress: string,
  functionName: string,
  args: unknown[] = [],
  value?: bigint,
  provider?: unknown
): Promise<{ txHash: string; result: unknown }> {
  const activeProvider = provider ?? (typeof window !== "undefined" ? window.ethereum : undefined);
  if (!activeProvider) {
    throw new Error("No wallet connected. Connect a wallet first.");
  }
  const client = await getWriteClient(activeProvider, address);
  const hash = await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName,
    args: args as CalldataEncodable[],
    value: value ?? BigInt(0),
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 120,
  });
  return { txHash: hash as string, result: receipt };
}

export { TransactionStatus };
