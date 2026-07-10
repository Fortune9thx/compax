import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus, CalldataEncodable } from "genlayer-js/types";

// Read-only client — no wallet needed for view calls
export function getReadClient() {
  return createClient({ chain: testnetBradbury });
}

export async function readContract<T = unknown>(
  contractAddress: string,
  functionName: string,
  args: CalldataEncodable[] = []
): Promise<T> {
  const client = getReadClient();
  return client.readContract({
    address: contractAddress as `0x${string}`,
    functionName,
    args,
  }) as Promise<T>;
}

// Write calls go through /api/write to keep the private key server-side
export async function writeContract(
  _walletAddress: string,
  contractAddress: string,
  functionName: string,
  args: unknown[] = [],
  value?: bigint
): Promise<{ txHash: string; result: unknown }> {
  const res = await fetch("/api/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contractAddress,
      functionName,
      args,
      value: value ? value.toString() : undefined,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Write failed");
  }
  return res.json();
}

export { TransactionStatus };
