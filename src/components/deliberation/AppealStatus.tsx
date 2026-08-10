import { Clock } from "lucide-react";

/**
 * Persistent, honest appeal-status note for a resolved instrument, shown even
 * outside a live DeliberationTheater (e.g. when reopening an already-resolved
 * escrow/market/credit line later). genlayer-js does not currently expose a
 * queryable "appeal window remaining" value on a transaction, so this is a
 * static explanation of the real protocol mechanism rather than a fabricated
 * countdown.
 */
export function AppealStatus({ className }: { className?: string }) {
  return (
    <div className={`compax-card flex items-start gap-2.5 text-[11px] text-text-muted leading-relaxed ${className ?? ""}`}>
      <Clock size={13} className="flex-none mt-0.5" />
      <span>
        This outcome was reached by five-validator consensus on GenLayer. GenLayer contracts have a native
        onchain appeal path — any observer can appeal a transaction while it is still within consensus rounds,
        triggering re-execution with a different validator set. We don&apos;t have a way to query the exact
        remaining appeal window from the client here, so treat a resolution as provisional until it has been
        settled on Bradbury for a while. See{" "}
        <a
          href="https://docs.genlayer.com/developers/intelligent-contracts/how-it-works"
          target="_blank"
          rel="noreferrer"
          className="text-accent-hover hover:underline"
        >
          GenLayer&apos;s docs on consensus and appeals
        </a>{" "}
        for how the mechanism works.
      </span>
    </div>
  );
}
