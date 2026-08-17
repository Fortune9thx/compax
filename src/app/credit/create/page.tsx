"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/Input";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useWallet } from "@/hooks/useWallet";

const EXAMPLE_PURPOSES = [
  "Bridge financing for inventory purchase ahead of a product launch.",
  "Short-term working capital for a consulting engagement.",
];

export default function CreateCreditLinePage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { state, run, reset } = useDeliberation();

  const [purpose, setPurpose] = useState("");
  const [collateral, setCollateral] = useState("");

  const canSubmit = purpose.trim().length > 10 && Number(collateral) > 0 && connected;

  const submit = async () => {
    const r = await run("CreditLine", "open_line", [purpose.trim()], BigInt(collateral));
    if (r.ok) setTimeout(() => router.push("/credit"), 1200);
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">Open a credit line</h1>
      </header>

      <Card className="max-w-2xl space-y-5">
        <div>
          <Label htmlFor="purpose">Purpose</Label>
          <Textarea
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="What is this credit for?"
            maxLength={500}
            charCount={purpose.length}
            rows={3}
          />
          <FieldHint>
            Examples:{" "}
            {EXAMPLE_PURPOSES.map((ex, i) => (
              <button key={i} type="button" onClick={() => setPurpose(ex)} className="underline decoration-dotted underline-offset-2 hover:text-accent-hover mr-2">
                &ldquo;{ex.slice(0, 28)}…&rdquo;
              </button>
            ))}
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="collateral">Collateral to post (cGEN)</Label>
          <Input id="collateral" type="number" min={1} value={collateral} onChange={(e) => setCollateral(e.target.value)} placeholder="10000" />
          <FieldHint>
            You don&apos;t choose the loan amount - the AI sets a maximum loan-to-value and interest
            rate this collateral supports (always over-collateralized) from your purpose and live
            market conditions. Whatever it decides, that&apos;s the most any lender can fund.
          </FieldHint>
        </div>

        <Button className="w-full" disabled={!canSubmit || state.phase === "deliberating" || state.phase === "submitting"} onClick={submit}>
          {state.phase === "deliberating" || state.phase === "submitting" ? "Reasoning terms…" : "Post collateral"}
        </Button>
        {!connected && <p className="text-xs text-danger">Connect a wallet to open a line.</p>}

        {state.phase !== "idle" && <DeliberationTheater state={state} onDismiss={reset} />}
      </Card>
    </AppShell>
  );
}
