// Redeploy LendingMarket + BuilderFunding with real owner-funded cGEN pools,
// then seed both pools from the owner/deployer account.
import { readFileSync, writeFileSync } from "fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const OUT = "deploy/redeploy-liquidity.log";
const log = (m) => { console.log(m); writeFileSync(OUT, m + "\n", { flag: "a" }); };
writeFileSync(OUT, "");

const env = readFileSync("deploy/.env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}
const account = createAccount(process.env.ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
log("Deployer / owner: " + account.address);

// Seed each pool with this much cGEN on deploy — enough for several small
// testnet loans/grants, small enough to be a sane default.
const SEED_AMOUNT = 100000n;

async function deployAndWait(name, path) {
  const code = readFileSync(path, "utf8");
  const hash = await client.deployContract({ code, args: [] });
  log(`[${name}] deploy tx: ${hash}`);
  let addr = null;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName || tx?.status);
    addr = tx?.recipient || addr;
    log(`  [${name}][${i}] ${status} ${addr || "-"}`);
    if (status.includes("REVERT") || status.includes("UNDETERMINED") || status.includes("CANCEL")) {
      log(`[${name}] FAILED — ${status}`);
      return null;
    }
    if (addr && (status.includes("ACCEPT") || status.includes("FINAL"))) break;
  }
  if (!addr) { log(`[${name}] FAILED — no address after polling`); return null; }
  log(`[${name}] deployed: ${addr}`);
  return addr;
}

async function readRetry(name, addr, fn, args = []) {
  for (let i = 0; i < 15; i++) {
    try {
      const r = await client.readContract({ address: addr, functionName: fn, args });
      log(`  ok [${name}] ${fn} => ${r}`);
      return r;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  log(`  FAIL [${name}] ${fn} after retries`);
  return null;
}

async function fundPool(name, addr) {
  try {
    const hash = await client.writeContract({ address: addr, functionName: "fund_pool", args: [], value: SEED_AMOUNT });
    log(`[${name}] fund_pool tx: ${hash}`);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      let tx;
      try { tx = await client.getTransaction({ hash }); } catch { continue; }
      const st = String(tx?.statusName || tx?.status);
      if (st.includes("ACCEPT") || st.includes("FINAL")) { log(`  [${name}] funded`); break; }
      if (st.includes("REVERT")) { log(`  [${name}] fund_pool REVERTED`); break; }
    }
  } catch (e) {
    log(`[${name}] fund_pool failed: ` + (e.message || e).slice(0, 150));
  }
}

const lmAddr = await deployAndWait("LendingMarket", "contracts/LendingMarket.py");
if (lmAddr) {
  await readRetry("LendingMarket", lmAddr, "get_loan_count");
  await fundPool("LendingMarket", lmAddr);
  await readRetry("LendingMarket", lmAddr, "get_pool_balance");
}

const bfAddr = await deployAndWait("BuilderFunding", "contracts/BuilderFunding.py");
if (bfAddr) {
  await readRetry("BuilderFunding", bfAddr, "get_total_allocated");
  await fundPool("BuilderFunding", bfAddr);
  await readRetry("BuilderFunding", bfAddr, "get_pool_balance");
}

log("\n─── SUMMARY ───");
log("LendingMarket: " + (lmAddr || "FAILED"));
log("BuilderFunding: " + (bfAddr || "FAILED"));
