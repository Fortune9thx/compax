/* ─── Compax keeper — the autonomous allocation cycle ────────────────────
   The intelligent contract is the portfolio manager. This process is only
   its heartbeat: it does not decide anything and it cannot move funds. Each
   cycle it reads the active economic event, then asks every vault's contract
   to reason over live market data and reallocate itself.

   All judgement happens onchain, inside rebalance_vault:
     · gl.nondet.web.get  → live CoinGecko prices + Fear & Greed index
     · gl.eq_principle    → five validators independently evaluate the result
     · the decision, its reasoning, and the raw data it read are all stored

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
const VAULT_MANAGER = addr("VaultManager");
const ECONOMIC_EVENTS = addr("EconomicEvents");

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

/** Wait for a tx to reach consensus. Intelligent-contract calls are slow. */
async function settle(hash, label, tries = 90) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName ?? tx?.status ?? "");
    if (status.includes("ACCEPT") || status.includes("FINAL")) {
      const vote = tx?.resultName ?? "";
      log(`    ${label} ${status}${vote ? ` · ${vote}` : ""}`);
      return { ok: true, tx };
    }
    if (status.includes("UNDETERMINED") || status.includes("CANCEL")) {
      log(`    ${label} ${status} — no consensus`);
      return { ok: false, tx };
    }
  }
  log(`    ${label} timed out awaiting consensus`);
  return { ok: false };
}

async function runCycle() {
  log("── cycle start ──");

  // guard: the keeper must be registered, or the contract will reject it
  try {
    const ok = await read(VAULT_MANAGER, "is_keeper", [account.address]);
    if (!ok) {
      log(`keeper ${account.address} is NOT registered — run add_keeper first. Aborting.`);
      return;
    }
  } catch {
    log("could not verify keeper registration — continuing (older contract?)");
  }

  // 1. what is the manager reacting to?
  let context = "";
  try {
    const ev = await read(ECONOMIC_EVENTS, "get_active_event", []);
    if (ev && ev.name) {
      context = `${ev.name}: ${ev.description} (severity ${ev.severity})`;
      log(`active event: ${ev.name} · severity ${ev.severity}`);
    } else {
      log("no active economic event");
    }
  } catch (e) {
    log("event read failed: " + String(e.message || e).slice(0, 90));
  }

  // 2. every vault under management
  let vaults = [];
  try {
    vaults = (await read(VAULT_MANAGER, "get_all_vaults", [])) || [];
  } catch (e) {
    log("vault read failed: " + String(e.message || e).slice(0, 90));
    return;
  }
  if (vaults.length === 0) {
    log("no vaults under management — nothing to do");
    return;
  }
  log(`${vaults.length} vault(s) under management`);

  // 3. ask each vault's contract to reason and reallocate
  let done = 0;
  for (const v of vaults) {
    const before = `L${v.allocation_lending}/S${v.allocation_staking}/B${v.allocation_builders}/P${v.allocation_predictions}`;
    log(`  ${v.id} ${v.name} — ${before} · ${v.treasury} cGEN`);
    if (DRY) { log("    (dry run — no write)"); continue; }

    try {
      const hash = await client.writeContract({
        address: VAULT_MANAGER,
        functionName: "rebalance_vault",
        args: [v.id, context],
        value: 0n,
      });
      log(`    tx ${hash.slice(0, 12)}… reasoning over live market data`);
      const { ok } = await settle(hash, v.id);
      if (!ok) continue;

      const after = await read(VAULT_MANAGER, "get_vault", [v.id]);
      if (after?.id) {
        const now = `L${after.allocation_lending}/S${after.allocation_staking}/B${after.allocation_builders}/P${after.allocation_predictions}`;
        log(`    ${before} → ${now}`);
        if (after.last_rebalance_reason) {
          log(`    "${String(after.last_rebalance_reason).slice(0, 150)}"`);
        }
      }
      done++;
    } catch (e) {
      log(`    failed: ${String(e.message || e).slice(0, 120)}`);
    }
  }

  try {
    const cycles = await read(VAULT_MANAGER, "get_cycle_count", []);
    log(`── cycle end · ${done}/${vaults.length} reallocated · ${cycles} total decisions ──`);
  } catch {
    log(`── cycle end · ${done}/${vaults.length} reallocated ──`);
  }
}

log(`keeper ${account.address}`);
log(`VaultManager ${VAULT_MANAGER}`);
if (DRY) log("DRY RUN — no transactions will be sent");

await runCycle();

if (LOOP) {
  log(`looping every ${INTERVAL_MIN} min — ctrl-c to stop`);
  setInterval(runCycle, INTERVAL_MIN * 60_000);
} else {
  process.exit(0);
}
