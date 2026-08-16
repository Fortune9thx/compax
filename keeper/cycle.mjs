/* ─── Compax v2 keeper - the autonomous adjudication heartbeat ───────────
   Reads every open escrow and every proposed/challenged market that's past
   its stated deadline, and asks the relevant contract to resolve() itself.
   The keeper decides nothing - resolve() still runs the real five-validator
   adjudication onchain, fetching its own live web data and reasoning fresh.
   The keeper only decides WHEN to ask, never WHAT the answer is, and never
   touches user funds (no method it calls accepts or moves value).

   Deadline enforcement: contracts on this GenVM build have no verified
   wall-clock primitive (every contract in this codebase stores timestamps
   as "" and ships on tx ordering - see contracts/deploy_order.md). Real
   date comparison therefore has to happen here, off-chain, where Date.now()
   is trivially available - not inside the contract, which can't do it
   reliably. If a stored deadline string doesn't parse as a real date, this
   keeper treats the instrument as eligible rather than silently skipping it
   forever.

   Vault capital movements: any depositor can challenge a specific move the
   vault owner made against the vault's stated objective. This keeper also
   resolves any movement sitting in "challenged" status - unlike
   escrows/markets, movements have no deadline concept, so eligibility is
   just "has an unresolved challenge," not a date comparison.

   Usage:
     node keeper/cycle.mjs              # one cycle
     node keeper/cycle.mjs --loop       # run forever, every INTERVAL_MIN
     node keeper/cycle.mjs --dry        # report what it would do, write nothing
──────────────────────────────────────────────────────────────────────── */
import { readFileSync } from "fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const INTERVAL_MIN = Number(process.env.INTERVAL_MIN || 30);
const LOOP = process.argv.includes("--loop");
const DRY = process.argv.includes("--dry");

// contract addresses come from the app's single source of truth
const src = readFileSync("src/lib/contracts.ts", "utf8");
const addr = (name) => {
  const m = src.match(new RegExp(`${name}:\\s*"(0x[0-9a-fA-F]{40})"`));
  if (!m) throw new Error(`address for ${name} not found in src/lib/contracts.ts`);
  return m[1];
};
const ESCROW_ADJUDICATOR = addr("EscrowAdjudicator");
const PREDICTION_MARKET = addr("PredictionMarket");
const VAULT_MANAGER = addr("VaultManager");

const env = readFileSync("deploy/.env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}
if (!process.env.ACCOUNT_PRIVATE_KEY) {
  console.error("ACCOUNT_PRIVATE_KEY missing (deploy/.env)");
  process.exit(1);
}

const account = createAccount(process.env.ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

const ts = () => new Date().toISOString().slice(11, 19);
const log = (m) => console.log(`[${ts()}] ${m}`);

async function read(address, functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

function isPastDeadline(deadline) {
  if (!deadline) return true; // no deadline recorded - don't block forever
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return true; // unparseable - treat as eligible, don't skip silently
  return d.getTime() <= Date.now();
}

/** Waits for a tx to reach consensus and reports the REAL result - a
 * statusName of ACCEPTED only means consensus was reached, which can
 * itself be consensus that execution errored. Always check
 * txExecutionResultName for the real outcome. */
async function settle(hash, label, tries = 90) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName ?? tx?.status ?? "");
    const execResult = String(tx?.txExecutionResultName ?? "");
    if (status.includes("ACCEPT") || status.includes("FINAL")) {
      const ok = execResult === "FINISHED_WITH_RETURN" || execResult === "" || execResult.includes("SUCCESS");
      log(`    ${label} ${status} · ${execResult || "no exec result"}`);
      return { ok, tx };
    }
    if (status.includes("UNDETERMINED") || status.includes("CANCEL")) {
      log(`    ${label} ${status} - no consensus`);
      return { ok: false, tx };
    }
  }
  log(`    ${label} timed out awaiting consensus`);
  return { ok: false };
}

async function resolveEscrows() {
  let escrows = [];
  try {
    escrows = (await read(ESCROW_ADJUDICATOR, "get_all_escrows", [0, 200])) || [];
  } catch (e) {
    log("escrow read failed: " + String(e.message || e).slice(0, 100));
    return;
  }
  const eligible = escrows.filter(
    (e) => (e.status === "evidence_submitted" || e.status === "challenged") && isPastDeadline(e.deadline)
  );
  if (eligible.length === 0) {
    log("no escrows ready to resolve");
    return;
  }
  log(`${eligible.length} escrow(s) ready to resolve`);
  for (const e of eligible) {
    log(`  ${e.id} · deadline ${e.deadline || "(none)"} · status ${e.status}`);
    if (DRY) { log("    (dry run - no write)"); continue; }
    try {
      const hash = await client.writeContract({
        address: ESCROW_ADJUDICATOR,
        functionName: "resolve",
        args: [e.id],
        value: 0n,
      });
      log(`    tx ${hash.slice(0, 12)}… adjudicating`);
      const { ok } = await settle(hash, e.id);
      if (ok) {
        const after = await read(ESCROW_ADJUDICATOR, "get_escrow", [e.id]);
        log(`    outcome: ${after?.outcome} · released ${after?.released_amount}/${after?.amount}`);
      }
    } catch (err) {
      log(`    failed: ${String(err.message || err).slice(0, 120)}`);
    }
  }
}

async function resolveMarkets() {
  let markets = [];
  try {
    markets = (await read(PREDICTION_MARKET, "get_all_markets", [0, 200])) || [];
  } catch (e) {
    log("market read failed: " + String(e.message || e).slice(0, 100));
    return;
  }
  const eligible = markets.filter(
    (m) => (m.status === "proposed" || m.status === "challenged") && isPastDeadline(m.deadline)
  );
  if (eligible.length === 0) {
    log("no markets ready to resolve");
    return;
  }
  log(`${eligible.length} market(s) ready to resolve`);
  for (const m of eligible) {
    log(`  ${m.id} · deadline ${m.deadline || "(none)"} · status ${m.status}`);
    if (DRY) { log("    (dry run - no write)"); continue; }
    try {
      const hash = await client.writeContract({
        address: PREDICTION_MARKET,
        functionName: "resolve",
        args: [m.id],
        value: 0n,
      });
      log(`    tx ${hash.slice(0, 12)}… adjudicating`);
      const { ok } = await settle(hash, m.id);
      if (ok) {
        const after = await read(PREDICTION_MARKET, "get_market", [m.id]);
        log(`    outcome: ${after?.outcome}`);
      }
    } catch (err) {
      log(`    failed: ${String(err.message || err).slice(0, 120)}`);
    }
  }
}

async function resolveVaultMovements() {
  let vaults = [];
  try {
    vaults = (await read(VAULT_MANAGER, "get_all_vaults", [0, 200])) || [];
  } catch (e) {
    log("vault read failed: " + String(e.message || e).slice(0, 100));
    return;
  }
  const eligible = [];
  for (const v of vaults) {
    let movements = [];
    try {
      movements = (await read(VAULT_MANAGER, "get_vault_movements", [v.id, 0, 200])) || [];
    } catch {
      continue;
    }
    for (const m of movements) {
      if (m.status === "challenged") eligible.push(m);
    }
  }
  if (eligible.length === 0) {
    log("no vault movements ready to resolve");
    return;
  }
  log(`${eligible.length} vault movement(s) ready to resolve`);
  for (const m of eligible) {
    log(`  ${m.id} · vault ${m.vault_id} · ${m.amount} cGEN toward ${m.instrument}`);
    if (DRY) { log("    (dry run - no write)"); continue; }
    try {
      const hash = await client.writeContract({
        address: VAULT_MANAGER,
        functionName: "resolve_movement",
        args: [m.id],
        value: 0n,
      });
      log(`    tx ${hash.slice(0, 12)}… adjudicating`);
      const { ok } = await settle(hash, m.id);
      if (ok) {
        const after = await read(VAULT_MANAGER, "get_movement", [m.id]);
        log(`    outcome: ${after?.outcome}`);
      }
    } catch (err) {
      log(`    failed: ${String(err.message || err).slice(0, 120)}`);
    }
  }
}

async function runCycle() {
  log("── cycle start ──");
  await resolveEscrows();
  await resolveMarkets();
  await resolveVaultMovements();
  log("── cycle end ──");
}

log(`keeper ${account.address}`);
log(`EscrowAdjudicator ${ESCROW_ADJUDICATOR}`);
log(`PredictionMarket ${PREDICTION_MARKET}`);
log(`VaultManager ${VAULT_MANAGER}`);
if (DRY) log("DRY RUN - no transactions will be sent");

await runCycle();

if (LOOP) {
  log(`looping every ${INTERVAL_MIN} min - ctrl-c to stop`);
  setInterval(runCycle, INTERVAL_MIN * 60_000);
} else {
  process.exit(0);
}
