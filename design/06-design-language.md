# 06 · DESIGN LANGUAGE GUIDE

## Color — the Sui ocean (verified hex from sui.io CSS)

```css
:root {
  /* canvas */
  --abyss:      #030f1c;  /* app background — Sui's deep hero navy */
  --panel:      #131518;  /* Sui grey-900 — cards, surfaces */
  --panel-2:    #222529;  /* Sui grey-800 — raised / hover surfaces */
  --hairline:   rgba(247,247,247,0.07);

  /* ink */
  --ink:        #f7f7f7;  /* Sui cultured — primary text */
  --ink-dim:    #a1a7b2;  /* Sui grey-300 — secondary */
  --ink-faint:  #6c7584;  /* Sui grey-500 — metadata */

  /* the intelligence color */
  --pulse:      #298dff;  /* Sui primary blue — AI, actions, focus */
  --pulse-soft: #4da2ff;  /* particles, links, live indicators */
  --deep-1:     #356af0;  /* ocean ramp for gradients/charts */
  --deep-2:     #0f42c3;
  --deep-3:     #0a3092;

  /* verdicts & weather */
  --affirm:     #2ee6a8;  /* approved / funded / yes */
  --stress:     #ff6c3d;  /* Sui orange — declined / risk / crisis events */
  --caution:    #ffc24d;  /* partial / warnings */

  /* gradient signature (Sui): vertical abyss → pulse → light */
  --sweep: linear-gradient(180deg, #030f1c 0%, #298dff 66%, #f7f7f7 120%);
}
```

Rules:
- `--pulse` blue is reserved for intelligence & action. Not decoration.
- `--stress` orange appears ONLY during events, risk, declines. Its rarity is its power.
- Charts use the deep ramp (`#4da2ff → #356af0 → #0f42c3 → #0a3092`), never rainbow.
- Light sections (landing acts may alternate): `#f4f5f7` canvas, `#131518` ink — Sui does this.

## Typography — the Kastle pairing

```css
--font-display: "Instrument Serif", Georgia, serif;   /* Kastle uses Reckless Neue (paid). 
                                                         Instrument Serif is the closest
                                                         free Google Font. OWNER MAY BUY
                                                         Reckless Neue for production. */
--font-mono:    "JetBrains Mono", ui-monospace, monospace;  /* exactly what Kastle uses */
```

| Role | Font | Size | Weight | Tracking | Case |
|---|---|---|---|---|---|
| Hero display | serif | clamp(40px, 5.9vw, 72px) | 400 | -0.03em | Sentence |
| Page title | serif | clamp(32px, 4vw, 56px) | 400 | -0.02em | Sentence |
| Thesis / quote | serif | 24–28px | 400 | -0.01em | Sentence |
| Section label | mono | 11px | 500 | +0.08em | UPPER |
| Body | mono | 14–15px | 300 | 0 | Sentence |
| Metadata | mono | 12px | 300 | +0.02em | mixed |
| Buttons | mono | 12–13px | 500 | +0.06em | UPPER |
| Numbers | mono | contextual | 400 | 0 | tabular-nums |

Fluid type via `clamp()` everywhere (Taste Labs pattern). Line-height: display 1.02–1.1, body 1.6.

## Space & structure
- Base unit 4px; section rhythm 96–160px vertical (generous — Kastle's whitespace).
- Page padding: `clamp(20px, 3.2vw, 40px)` (Taste Labs token).
- Radius: pills 999px, panels 16px, inputs 0 (bottom-border only).
- Borders: 1px hairlines only. Depth comes from bg steps (abyss→panel→panel-2), not shadow.
- One glow per viewport: `box-shadow: 0 0 24px rgba(41,141,255,0.35)`.

## Voice & copy
- The AI speaks in first person, present tense: "Reducing lending exposure by 15%."
- Labels are machine-calm: `READING PROFILE`, `COUNCIL DISCUSSION`, `VERDICT`.
- Numbers are never naked — always with a movement cue ("↑ from yesterday", "2h ago").
- No exclamation marks. Confidence is quiet.

## Iconography & texture
- Icons: Lucide, 1.5px stroke, 14–16px, always beside mono labels — never decorative.
- Texture: fine dotted flow-paths (1px dots) as ambient background; no noise/grain.
- Agent identities: colored dots (risk `#ff6c3d`, yield `#2ee6a8`, liquidity `#4da2ff`,
  macro `#c2c6cd`) — same dot everywhere that agent appears.

## Do / Don't
- DO lead cards with a thesis sentence in serif. DON'T lead with a number grid.
- DO animate every value change. DON'T swap numbers instantly.
- DO let one thing glow. DON'T neon everything.
- DO narrate errors in mono with countdowns. DON'T show raw RPC errors.
- If a screen could be a Dune dashboard screenshot, redesign it.
