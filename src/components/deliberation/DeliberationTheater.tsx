"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, ExternalLink, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { NETWORK } from "@/lib/contracts";
import type { DeliberationState } from "@/hooks/useDeliberation";

export interface ResolutionSummary {
  reasoning?: string;
  evidenceSnapshot?: string;
  webDataSnapshot?: string;
  outcomeLabel?: string;
}

const PHASE_COPY: Record<string, string> = {
  submitting: "Submitting to Bradbury…",
  deliberating: "Validators deliberating…",
  accepted: "Consensus reached",
  failed: "Consensus not reached",
};

export function DeliberationTheater({
  state,
  resolution,
  onDismiss,
  className,
}: {
  state: DeliberationState;
  resolution?: ResolutionSummary;
  onDismiss?: () => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (state.phase === "idle") return null;

  const isDeliberating = state.phase === "submitting" || state.phase === "deliberating";
  const isAccepted = state.phase === "accepted";
  const isFailed = state.phase === "failed";

  const votes = state.validatorVotes ?? Array(5).fill(null);

  return (
    <div className={cn("compax-card-elevated overflow-hidden", className)} role="status" aria-live="polite">
      <div className="flex items-center gap-4 p-4">
        <div className="flex gap-1.5 flex-none" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => {
            const vote = votes[i];
            const color = isDeliberating
              ? "bg-deliberating"
              : isAccepted
                ? "bg-success"
                : vote === "AGREE"
                  ? "bg-success"
                  : "bg-danger";
            return (
              <span
                key={i}
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  color,
                  isDeliberating && "deliberate-dot"
                )}
                style={isDeliberating ? { animationDelay: `${i * 0.12}s` } : undefined}
              />
            );
          })}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isAccepted && <CheckCircle2 size={15} className="text-success flex-none" />}
            {isFailed && <XCircle size={15} className="text-danger flex-none" />}
            <span className="text-sm font-medium text-text-primary">
              {PHASE_COPY[state.phase] ?? state.phase}
            </span>
          </div>
          {state.txHash && (
            <a
              href={`${NETWORK.explorerUrl}tx/${state.txHash}`}
              target="_blank"
              rel="noreferrer"
              className="compax-mono text-[11px] text-text-muted hover:text-accent-hover inline-flex items-center gap-1 mt-0.5"
            >
              {state.txHash.slice(0, 10)}…{state.txHash.slice(-8)}
              <ExternalLink size={10} />
            </a>
          )}
          {isFailed && state.error && (
            <p className="text-xs text-danger mt-1">{state.error}</p>
          )}
        </div>

        {(isAccepted || isFailed) && (
          <div className="flex items-center gap-1 flex-none">
            {(resolution || state.validatorVotes) && (
              <button
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                aria-label="Toggle deliberation details"
                className="text-text-muted hover:text-text-primary p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label="Dismiss"
                className="text-text-muted hover:text-text-primary p-1.5 rounded-md hover:bg-bg-elevated transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {isAccepted && (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-[11px] text-text-muted border-t border-border/60 pt-2.5">
          <Clock size={11} className="flex-none" />
          <span>
            Accepted by five-validator consensus. GenLayer&apos;s native appeal window is open - the
            outcome above can still be challenged onchain before it finalizes.
          </span>
        </div>
      )}

      {expanded && (resolution || state.validatorVotes) && (
        <div className="border-t border-border bg-bg-primary/40 p-4 space-y-3">
          {state.validatorVotes && (
            <div>
              <span className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">
                Validator votes
              </span>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {state.validatorVotes.map((v, i) => (
                  <span
                    key={i}
                    className={cn(
                      "compax-mono text-[10px] px-2 py-1 rounded-md border",
                      v === "AGREE"
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-danger/30 bg-danger/10 text-danger"
                    )}
                  >
                    #{i + 1} {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          {resolution?.outcomeLabel && (
            <div>
              <span className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">Outcome</span>
              <p className="text-sm text-text-primary mt-1">{resolution.outcomeLabel}</p>
            </div>
          )}
          {resolution?.reasoning && (
            <div>
              <span className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">Reasoning</span>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">{resolution.reasoning}</p>
            </div>
          )}
          {resolution?.evidenceSnapshot && (
            <div>
              <span className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">Evidence considered</span>
              <p className="compax-mono text-xs text-text-secondary mt-1 leading-relaxed whitespace-pre-wrap">{resolution.evidenceSnapshot}</p>
            </div>
          )}
          {resolution?.webDataSnapshot && (
            <div>
              <span className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">Live web data used</span>
              <p className="compax-mono text-xs text-text-secondary mt-1 leading-relaxed break-all">{resolution.webDataSnapshot}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
