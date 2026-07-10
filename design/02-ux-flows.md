# 02 · UX FLOWS

Every flow follows the Compass grammar: **BRIEF → DELIBERATE → VERDICT → RIPPLE.**
The user briefs the AI; the AI deliberates visibly; a verdict lands; the ripple
shows how the economy adjusted. The deliberation IS the product.

---

## F1 · First visit (Landing → Ecosystem)
1. Land on `/`. Cinematic hero: type splits in character-by-character; capital-flow
   lines draw themselves in the background.
2. Scroll: 3–4 choreographed acts (see wireframes) — each a single idea, no stats wall.
3. CTA "ENTER COMPASS" → 0.6s page-out (content lifts + fades, flow lines persist)
   → `/ecosystem` fades in with the map already alive. The flow lines are the
   *connective tissue* between landing and app.

## F2 · Watching the economy (Ecosystem)
1. Arrive: living map is already moving — pulses travel Vault→Loan, Loan→Reputation, etc.
2. Hover any node: it swells; its flows brighten; others dim (focus state).
3. Click a node → side dossier panel slides in (280ms, taste-ease): live numbers,
   last 3 AI decisions, "open" link to the full page.
4. Active economic event = weather: map tint shifts, affected edges turn amber/red,
   event banner narrates ("Liquidity crisis — vaults reducing lending exposure").
5. Ticker tape runs the latest decisions; clicking one flies the camera to that node.

## F3 · Reading a fund (Vault Marketplace → Fund Room)
1. `/vaults`: fund cards stack-reveal on scroll. Each card leads with the fund's
   *thesis sentence* — not TVL. ("Compass Alpha · quant · 'Liquidity risk rising;
   rotating toward builders.'")
2. Click card → shared-element transition: card expands into the Fund Room header.
3. Fund Room reads top-to-bottom like a fund letter: Thesis → Council → Decisions →
   Allocation. Deposit rail floats right, quiet.

## F4 · Briefing a new fund (Vault Genesis)
1. "CREATE FUND" → conversational stepper (one question per screen, split-text in):
   name → objective → risk appetite (slider renders as a risk gauge) → personality.
2. Submit → GENESIS SEQUENCE: full-screen deliberation — the four council agents
   introduce themselves one by one and state their initial stance; allocation donut
   draws itself; treasury seeds.
3. Lands in the new Fund Room with a "born just now" timeline entry.

## F5 · Requesting credit (Lending)
1. `/lending` shows the DECISION FEED first — recent verdicts as narrative cards,
   approved/rejected, with reasoning excerpts. Users learn the desk by watching it.
2. "REQUEST CREDIT" → briefing: amount, duration, purpose, story.
3. Submit → DELIBERATION THEATER (the money moment):
   - Stage 1 "READING PROFILE": reputation ring draws to 84; prior loans count up;
     success-rate bar fills. (data pulled live from ReputationSystem)
   - Stage 2 "EVALUATING": streaming-text effect as the AI's reasoning arrives.
   - Stage 3 "VERDICT": APPROVED stamps down (scale 1.2→1 + settle); rate and risk
     score count up; confetti of flow-particles routes from the lending pool node
     to the borrower node.
4. Verdict card is permanent content in the feed — every decision enriches the desk.

## F6 · Pitching a project (Builders / Demo Day)
1. `/builders`: pitch cards in a demo-day grid; each carries Innovation Score,
   Risk Score, Funding Recommendation as council-stamped marks.
2. "PITCH PROJECT" → briefing: name, story, ask, outcome, timeline.
3. Submit → COUNCIL REVIEW: three reviewer voices appear sequentially (innovation,
   risk, capital-fit), each typing a one-line take; scores count up; verdict lands
   (FUNDED / PARTIAL / PASSED) with allocated amount counting to final.
4. Funded projects get a "backed by Compass" badge and progress meter.

## F7 · Reading yourself (Reputation)
1. Identity header: score ring draws itself; tier title in serif display.
2. Below: LIFE TIMELINE — vertical spine; every loan, funding, prediction, vault
   action is a node that reveals on scroll (alternating sides on desktop).
3. Score breakdown renders as contribution streams flowing INTO the ring, not bars.
4. cGEN faucet = "provisioning" moment: claim → particles flow into balance counter.

## F8 · Taking a position (Predictions)
1. Markets render as signal cards: question in serif, YES/NO as a tension bar
   (two fluids pressing against each other, animated on every stake).
2. Each card shows its ecosystem hooks: "3 vaults hold positions · feeds lending
   risk model" with mini connection lines.
3. Stake flow: pick side → amount → submit → your particles visibly join your side
   of the tension bar; odds re-balance with spring physics.
4. Resolution: AI verdict narrated (reasoning text), winning side's fluid floods
   the bar, payouts ripple outward on the ecosystem map.

## F9 · Error / empty / loading grammar
- Loading = "the AI is thinking": shimmer + orbiting particle on the accent node.
  Never bare spinners on flagship moments.
- Empty = an invitation with motion ("No funds yet — capital is waiting" + idle
  flow-line ambient), never a dead grey box.
- Error = honest, mono, small: "RPC congested — retrying in 3s" with a live countdown.
  (Bradbury rate limits make this a first-class state.)
