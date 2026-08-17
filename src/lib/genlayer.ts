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

// ─── Best-effort human-readable revert reason ───
// GenVM's debug trace returns the raw error object as a length-prefixed
// binary blob (undocumented format, no public decoder exported from
// genlayer-js). Rather than reimplement that binary format, we scrape
// printable-ASCII runs out of it - the literal UserError message we raise
// in our own contracts (e.g. "market_not_ready_for_resolution") shows up
// verbatim as one of those runs, distinctly longer than the surrounding
// GenVM/Python stack-trace noise tokens. Best-effort only: falls back to
// null (caller shows a generic message) if nothing usable is found.
const TRACE_NOISE = [
  "module_name", "cpython", "module_instances", "memories", "softfloat",
  "kind", "storage_changes", "storage_proof", "fingerprint", "frames", "events",
];

function isTraceNoise(s: string): boolean {
  const lower = s.toLowerCase();
  return TRACE_NOISE.some((n) => lower.includes(n));
}

export function extractRevertReason(hexReturnData: unknown): string | null {
  if (typeof hexReturnData !== "string" || !hexReturnData.startsWith("0x")) return null;
  try {
    const hex = hexReturnData.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);

    const runs: string[] = [];
    let cur: number[] = [];
    for (const b of bytes) {
      if (b >= 0x20 && b <= 0x7e) {
        cur.push(b);
      } else {
        if (cur.length >= 6) runs.push(String.fromCharCode(...cur));
        cur = [];
      }
    }
    if (cur.length >= 6) runs.push(String.fromCharCode(...cur));

    const candidates = runs.filter((r) => !isTraceNoise(r));
    if (candidates.length === 0) return null;
    const best = candidates.reduce((a, b) => (b.length > a.length ? b : a));
    return best.replace(/_/g, " ").trim() || null;
  } catch {
    return null;
  }
}

async function tryExtractRevertReason(
  client: { debugTraceTransaction: (a: { hash: string }) => Promise<unknown> },
  hash: string
): Promise<string | null> {
  try {
    const trace = (await client.debugTraceTransaction({ hash })) as { return_data?: string };
    return extractRevertReason(trace?.return_data);
  } catch {
    return null;
  }
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

  const execResult = String((receipt as { txExecutionResultName?: string })?.txExecutionResultName ?? "");
  const ok = execResult === "FINISHED_WITH_RETURN" || execResult === "" || execResult.includes("SUCCESS");
  if (!ok) {
    const reason = await tryExtractRevertReason(
      client as unknown as { debugTraceTransaction: (a: { hash: string }) => Promise<unknown> },
      hash as string
    );
    throw new Error(reason ?? `Execution ${execResult || "failed"}`);
  }

  return { txHash: hash as string, result: receipt };
}

export { TransactionStatus };
