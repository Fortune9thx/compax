# 01 · APPLICATION SITEMAP

```
compass
│
├── /                       LANDING — "The Signal"
│   └── purpose: curiosity. cinematic. no dashboards, no stat walls.
│
├── /ecosystem              THE LIVING MAP — flagship ambient view
│   └── animated capital-flow graph: Vaults → Loans → Builders → Predictions
│
├── /vaults                 FUND MARKETPLACE
│   ├── purpose: browse AI funds like reading investor profiles
│   └── /vaults/[id]        FUND ROOM — flagship detail page
│       ├── Current Thesis (live AI statement)
│       ├── Council Discussion (Risk/Yield/Liquidity/Macro agents)
│       ├── Decision History (every decision = content)
│       └── Deposit / Withdraw (side rail, quiet)
│
├── /vaults/create          FUND GENESIS — brief the AI, watch it form
│
├── /lending                CREDIT DESK
│   ├── live decision feed (watch AI evaluate in real time)
│   └── request flow = briefing + live deliberation theater
│
├── /builders               DEMO DAY
│   ├── projects as pitch cards (YC demo day energy)
│   └── AI council review: Innovation Score / Risk Score / Recommendation
│
├── /predictions            SIGNAL EXCHANGE
│   └── integrated: shows which vaults hold positions, how predictions
│       feed lending rates and vault allocations (connection lines)
│
├── /reputation             FINANCIAL IDENTITY
│   └── a timeline biography of your on-chain economic life
│
└── /events (folded INTO /ecosystem — not a separate nav item)
    └── economic events are weather on the living map
```

## Navigation model
- Persistent left rail (compact, icon+label, mono uppercase).
- Order: Ecosystem · Vaults · Lending · Builders · Predictions · Reputation.
- Landing has NO app chrome — full-bleed cinematic page with single "Enter Compass" portal.
- Global ticker strip (bottom or top edge, inside app): latest AI decisions scroll past
  like a market tape — every page feels connected to the same living economy.

## Page hierarchy by design investment
1. **/vaults/[id]** — flagship. The AI hedge-fund room.
2. **/ecosystem** — the living map. First thing users see after entering.
3. **/** — landing. Creates the desire to enter.
4. **/lending** — decision theater.
5. **/builders** — demo day.
6. **/reputation** — identity portrait.
7. **/predictions** — signal exchange.
8. **/vaults** & **/vaults/create** — marketplace & genesis.
