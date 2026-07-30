// Redeploy VaultManager, StakingReserve, PredictionMarkets — real payout via
// verified _Recipient(Address).emit_transfer() pattern (docs.genlayer.com
// /developers/intelligent-contracts/advanced-features/value-transfers).
import { readFileSync, writeFileSync } from "fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const OUT = "deploy/redeploy-settlement.log";
const log = (m) => { console.log(m); writeFileSync(OUT, m + "\n", { flag: "a" }); };
writeFileSync(OUT, "");

const env = readFileSync("deploy/.env", "utf8");
for (const line of env.split("\n")) {
  const [k, ...v] = line.split("=");
  if (k && v.length) process.env[k.trim()] = v.join("=").trim();
}
const account = createAccount(process.env.ACCOUNT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });
log("Deployer / keeper: " + account.address);

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

async function verify(name, addr, fn, args = []) {
  try {
    const r = await client.readContract({ address: addr, functionName: fn, args });
    log(`  ok [${name}] ${fn} => ${r}`);
    return true;
  } catch (e) {
    log(`  FAIL [${name}] ${fn}: ${(e.message || e).slice(0, 100)}`);
    return false;
  }
}

const vmAddr = await deployAndWait("VaultManager", "contracts/VaultManager.py");
if (vmAddr) {
  await verify("VaultManager", vmAddr, "get_active_vault_count");
  try {
    const kh = await client.writeContract({ address: vmAddr, functionName: "add_keeper", args: [account.address], value: 0n });
    log("add_keeper tx: " + kh);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      let tx;
      try { tx = await client.getTransaction({ hash: kh }); } catch { continue; }
      const st = String(tx?.statusName || tx?.status);
      if (st.includes("ACCEPT") || st.includes("FINAL")) { log("  keeper accepted"); break; }
    }
    const ok = await client.readContract({ address: vmAddr, functionName: "is_keeper", args: [account.address] });
    log("is_keeper => " + ok);
  } catch (e) {
    log("add_keeper failed: " + (e.message || e).slice(0, 140));
  }
}

const srAddr = await deployAndWait("StakingReserve", "contracts/StakingReserve.py");
if (srAddr) await verify("StakingReserve", srAddr, "get_total_staked");

const pmAddr = await deployAndWait("PredictionMarkets", "contracts/PredictionMarkets.py");
if (pmAddr) await verify("PredictionMarkets", pmAddr, "get_total_volume");

log("\n─── SUMMARY ───");
log("VaultManager: " + (vmAddr || "FAILED"));
log("StakingReserve: " + (srAddr || "FAILED"));
log("PredictionMarkets: " + (pmAddr || "FAILED"));
