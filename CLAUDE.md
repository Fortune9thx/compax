# COMPAX v2 - Project Notes

COMPAX is "The Adjudication Layer for Autonomous Capital" - a GenLayer intelligent-contract
platform on Bradbury testnet. See [README.md](README.md) for the product thesis and
architecture, [SECURITY.md](SECURITY.md) for the trust model and access-control matrix, and
[SUBMISSION.md](SUBMISSION.md) for the portal submission summary.

## Local dev

```bash
npm install
npm run dev
```

Contracts live in `contracts/`, deployed addresses in `src/lib/contracts.ts`. Redeploy with
`node deploy/deploy.mjs`; see `contracts/deploy_order.md` for the trusted-source registration
step that has to follow it.
