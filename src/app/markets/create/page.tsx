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

const EXAMPLE_QUESTIONS = [
  "Will Bitcoin's price exceed $100,000 USD before 2027-01-01?",
  "Will the announced protocol upgrade ship on its stated mainnet date?",
];

export default function CreateMarketPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const { state, run, reset } = useDeliberation();

  const [question, setQuestion] = useState("");
  const [sources, setSources] = useState("");
  const [deadline, setDeadline] = useState("");

  const canSubmit = question.trim().length > 10 && deadline.trim().length > 0 && connected;

  const submit = async () => {
    const r = await run("PredictionMarket", "create_market", [question.trim(), sources.trim(), deadline.trim()]);
    if (r.ok) setTimeout(() => router.push("/markets"), 1200);
  };

  return (
    <AppShell>
      <header className="mb-8">
        <h1 className="compax-serif text-3xl text-text-primary">New market</h1>
      </header>

      <Card className="max-w-2xl space-y-5">
        <div>
          <Label htmlFor="question">Question</Label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="A precise, binary (yes/no) question with a clear resolution date."
            maxLength={400}
            charCount={question.length}
            rows={3}
          />
          <FieldHint>
            Examples:{" "}
            {EXAMPLE_QUESTIONS.map((ex, i) => (
              <button key={i} type="button" onClick={() => setQuestion(ex)} className="underline decoration-dotted underline-offset-2 hover:text-accent-hover mr-2">
                &ldquo;{ex.slice(0, 32)}…&rdquo;
              </button>
            ))}
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="sources">Resolution source URL (optional)</Label>
          <Input id="sources" value={sources} onChange={(e) => setSources(e.target.value)} placeholder="https://… - a real URL gets fetched live at resolution time" />
          <FieldHint>
            A URL here is fetched live when the market resolves and becomes the primary evidence -
            without one, resolution relies on submitted evidence and general knowledge only.
          </FieldHint>
        </div>

        <div>
          <Label htmlFor="deadline">Resolution deadline</Label>
          <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <FieldHint>Outcomes can&apos;t be proposed until this date has passed.</FieldHint>
        </div>

        <Button className="w-full" disabled={!canSubmit || state.phase === "deliberating" || state.phase === "submitting"} onClick={submit}>
          {state.phase === "deliberating" || state.phase === "submitting" ? "Creating…" : "Create market"}
        </Button>
        {!connected && <p className="text-xs text-danger">Connect a wallet to create a market.</p>}

        {state.phase !== "idle" && <DeliberationTheater state={state} onDismiss={reset} />}
      </Card>
    </AppShell>
  );
}
