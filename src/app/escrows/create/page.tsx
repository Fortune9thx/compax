"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/Input";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useWallet } from "@/hooks/useWallet";

const EXAMPLE_CRITERIA = [
  "Deliver a fully responsive landing page matching the attached Figma spec, deployed to a live URL.",
  "Provide a signed audit report identifying all critical and high-severity vulnerabilities in the given repository.",
  "Deliver 10 original blog posts of at least 800 words each, published to the client's CMS.",
];

export default function CreateEscrowPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { state, run, reset } = useDeliberation();

  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState("");
  const [criteria, setCriteria] = useState("");
  const [deadline, setDeadline] = useState("");
  const [evidenceTypes, setEvidenceTypes] = useState("text, urls");
  const [amount, setAmount] = useState("");

  const canContinueStep1 = provider.trim().length > 10 && criteria.trim().length > 20 && deadline.trim().length > 0;
  const canSubmit = canContinueStep1 && Number(amount) > 0 && connected;

  const submit = async () => {
    const r = await run(
      "EscrowAdjudicator",
      "create_escrow",
      [provider.trim(), criteria.trim(), deadline.trim(), evidenceTypes.trim(), ""],
      BigInt(amount)
    );
    if (r.ok) setTimeout(() => router.push("/escrows"), 1200);
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">New escrow</h1>
        <p className="text-sm text-text-muted mt-1.5">Step {step} of 2</p>
      </header>

      <div className="flex gap-2 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-accent" : "bg-bg-elevated"}`} />
        ))}
      </div>

      <Card className="max-w-2xl">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="provider">Provider address</Label>
              <Input
                id="provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="0x… - who must deliver and accept this mandate"
              />
            </div>

            <div>
              <Label htmlFor="criteria">Success criteria</Label>
              <Textarea
                id="criteria"
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                placeholder="State exactly what must be true for this escrow to release in full - this is what validators will evaluate the evidence against."
                maxLength={800}
                charCount={criteria.length}
                rows={4}
              />
              <FieldHint>
                Examples:{" "}
                {EXAMPLE_CRITERIA.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCriteria(ex)}
                    className="underline decoration-dotted underline-offset-2 hover:text-accent-hover mr-2"
                  >
                    &ldquo;{ex.slice(0, 28)}…&rdquo;
                  </button>
                ))}
              </FieldHint>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <FieldHint>If the provider never delivers, you can reclaim your funds after this date.</FieldHint>
              </div>
              <div>
                <Label htmlFor="evidence">Required evidence types</Label>
                <Input id="evidence" value={evidenceTypes} onChange={(e) => setEvidenceTypes(e.target.value)} placeholder="text, urls" />
              </div>
            </div>

            <Button className="w-full" disabled={!canContinueStep1} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <Label htmlFor="amount">Amount to lock (cGEN)</Label>
              <Input id="amount" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
              <FieldHint>Sent to the escrow contract now. Released, partially released, or clawed back on resolution.</FieldHint>
            </div>

            <div className="rounded-lg border border-border bg-bg-primary/40 p-4 space-y-2 text-xs">
              <p className="compax-mono text-[10px] uppercase tracking-wider text-text-muted">What the AI will evaluate</p>
              <p className="text-text-secondary leading-relaxed">
                Once the provider accepts and submits evidence, five validators will independently fetch live web
                data and decide whether the evidence satisfies: <span className="text-text-primary">&ldquo;{criteria || "…"}&rdquo;</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" disabled={!canSubmit || state.phase === "deliberating" || state.phase === "submitting"} onClick={submit}>
                {state.phase === "deliberating" || state.phase === "submitting" ? "Locking capital…" : "Create escrow"}
              </Button>
            </div>
            {!connected && <p className="text-xs text-danger">Connect a wallet to create an escrow.</p>}

            {state.phase !== "idle" && <DeliberationTheater state={state} onDismiss={reset} />}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
