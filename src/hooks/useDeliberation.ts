"use client";

import { useCallback, useState } from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { _state } from "@/hooks/useWallet";
import { CONTRACTS } from "@/lib/contracts";

export type DeliberationPhase = "idle" | "submitting" | "deliberating" | "accepted" | "failed";

export interface DeliberationState {
  phase: DeliberationPhase;
  txHash?: string;
  statusName?: string;
  execResult?: string;
  validatorVotes?: string[];
  error?: string;
}

const DEFAULT: DeliberationState = { phase: "idle" };

/** Drives a write call through GenLayer's real deliberation lifecycle
 * (PROPOSING -> COMMITTING -> REVEALING -> ACCEPTED, with the actual
 * per-validator votes and execution result) rather than a single opaque
 * await, so the UI can show the process live. */
export function useDeliberation() {
  const [state, setState] = useState<DeliberationState>(DEFAULT);

  const run = useCallback(
    async (contract: keyof typeof CONTRACTS, method: string, args: unknown[], value?: bigint) => {
      const { address, connected, provider } = _state;
      if (!connected || !address || !provider) {
        setState({ phase: "failed", error: "Wallet not connected." });
        return { ok: false as const };
      }
      setState({ phase: "submitting" });
      try {
        const client = createClient({
          chain: testnetBradbury,
          account: address as `0x${string}`,
          provider: provider as never,
        });
        // Do NOT call client.connect() here - inside genlayer-js that function
        // talks to the global window.ethereum directly (bypassing the provider
        // just configured above) and throws a hardcoded "MetaMask is not
        // installed." for any wallet that doesn't also register itself as
        // window.ethereum (e.g. OKX in a multi-wallet setup). chain is already
        // set via the option above, and useWallet.ts already did the real
        // eth_requestAccounts/chain-switch handshake against this provider.
        const hash = await client.writeContract({
          address: CONTRACTS[contract],
          functionName: method,
          args: args as never[],
          value: value ?? BigInt(0),
        });
        setState({ phase: "deliberating", txHash: hash as string });

        for (let i = 0; i < 150; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          let tx: Record<string, unknown> | undefined;
          try {
            tx = (await client.getTransaction({ hash })) as unknown as Record<string, unknown>;
          } catch {
            continue;
          }
          const statusName = String(tx?.statusName ?? tx?.status ?? "");
          const execResult = String(tx?.txExecutionResultName ?? "");
          const lastRound = tx?.lastRound as { validatorVotesName?: string[] } | undefined;
          const validatorVotes = lastRound?.validatorVotesName;

          if (statusName.includes("ACCEPT") || statusName.includes("FINAL")) {
            const ok =
              execResult === "FINISHED_WITH_RETURN" || execResult === "" || execResult.includes("SUCCESS");
            setState({
              phase: ok ? "accepted" : "failed",
              txHash: hash as string,
              statusName,
              execResult,
              validatorVotes,
              error: ok ? undefined : `Execution ${execResult || "failed"}`,
            });
            return { ok, txHash: hash as string };
          }
          if (statusName.includes("REVERT") || statusName.includes("UNDETERMINED") || statusName.includes("CANCEL")) {
            setState({ phase: "failed", txHash: hash as string, statusName, error: statusName });
            return { ok: false as const, txHash: hash as string };
          }
          setState((s) => ({ ...s, phase: "deliberating", statusName }));
        }
        setState({ phase: "failed", txHash: hash as string, error: "Timed out waiting for consensus." });
        return { ok: false as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState({ phase: "failed", error: msg });
        return { ok: false as const };
      }
    },
    []
  );

  const reset = useCallback(() => setState(DEFAULT), []);

  return { state, run, reset };
}
