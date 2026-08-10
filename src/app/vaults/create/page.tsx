"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Label, FieldHint } from "@/components/ui/Input";
import { Slider } from "@/components/ui/Slider";
import { DeliberationTheater } from "@/components/deliberation/DeliberationTheater";
import { useDeliberation } from "@/hooks/useDeliberation";
import { useWallet } from "@/hooks/useWallet";

const EXAMPLE_OBJECTIVES = [
  "Grow this treasury toward steady income with low risk, paying only for verified deliverables from contractors.",
  "Fund short-term working capital needs for trusted counterparties, collateral-backed.",
  "Speculate on well-defined, verifiable outcomes with a portion of this capital.",
];

const RISK_LABELS: Record<number, string> = {
  1: "Extremely conservative", 2: "Conservative", 3: "Cautious", 4: "Measured",
  5: "Balanced", 6: "Growth-leaning", 7: "Elevated", 8: "Aggressive",
  9: "High conviction", 10: "Maximum risk tolerance",
};

export default function CreateVaultPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { state, run, reset } = useDeliberation();

  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [risk, setRisk] = useState(5);
  const [personality, setPersonality] = useState("balanced");

  const canSubmit = name.trim().length > 0 && objective.trim().length > 20 && connected;

  const submit = async () => {
    const r = await run("VaultManager", "create_vault", [name.trim(), objective.trim(), risk, personality.trim()]);
    if (r.ok) setTimeout(() => router.push("/vaults"), 1200);
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">New vault</h1>
      </header>

      <Card className="max-w-2xl space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Steady Income Vault" maxLength={80} />
        </div>

        <div>
          <Label htmlFor="objective">Objective</Label>
          <Textarea
            id="objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="State the mandate in your own words."
            maxLength={500}
            charCount={objective.length}
            rows={4}
          />
          <FieldHint>
            Examples:{" "}
            {EXAMPLE_OBJECTIVES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setObjective(ex)}
                className="underline decoration-dotted underline-offset-2 hover:text-accent-hover mr-2"
              >
                &ldquo;{ex.slice(0, 30)}…&rdquo;
              </button>
            ))}
          </FieldHint>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="mb-0">Risk tolerance</Label>
            <span className="compax-mono text-xs text-text-secondary">{risk}/10 - {RISK_LABELS[risk]}</span>
          </div>
          <Slider value={risk} onValueChange={setRisk} />
        </div>

        <div>
          <Label htmlFor="personality">Personality</Label>
          <Input id="personality" value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="conservative, opportunistic, methodical…" maxLength={50} />
        </div>

        <div className="rounded-lg border border-border bg-bg-primary/40 p-4 text-xs">
          <p className="compax-mono text-[10px] uppercase tracking-wider text-text-muted mb-2">What the AI will decide</p>
          <p className="text-text-secondary leading-relaxed">
            Which instrument types - escrow, prediction, credit - this vault&apos;s mandate permits, reasoned from
            your objective and risk tolerance. Capital can only ever leave this vault toward an instrument type the
            mandate has approved.
          </p>
        </div>

        <Button className="w-full" disabled={!canSubmit || state.phase === "deliberating" || state.phase === "submitting"} onClick={submit}>
          {state.phase === "deliberating" || state.phase === "submitting" ? "Reasoning mandate…" : "Create vault"}
        </Button>
        {!connected && <p className="text-xs text-danger">Connect a wallet to create a vault.</p>}

        {state.phase !== "idle" && <DeliberationTheater state={state} onDismiss={reset} />}
      </Card>
    </AppShell>
  );
}
