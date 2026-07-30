// Redeploy VaultManager (withdraw bug fix + reasoned initial allocation + sanitize
// hardening) and ReputationSystem (reasoned score deltas + sanitize hardening).
// Uses manual polling (not waitForTransactionReceipt) to avoid the known BigInt
// serialization crash in genlayer-js on Bradbury.
import { readFileSync, writeFileSync } from "fs";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const OUT = "deploy/redeploy-fixed.log";
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

// ── VaultManager ──
const vmAddr = await deployAndWait("VaultManager", "contracts/VaultManager.py");
if (vmAddr) {
  await verify("VaultManager", vmAddr, "get_active_vault_count");
  await verify("VaultManager", vmAddr, "get_cycle_count");
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

// ── ReputationSystem ──
const repAddr = await deployAndWait("ReputationSystem", "contracts/ReputationSystem.py");
if (repAddr) {
  await verify("ReputationSystem", repAddr, "can_claim_faucet", [account.address]);
}

log("\n─── SUMMARY ───");
log("VaultManager: " + (vmAddr || "FAILED"));
log("ReputationSystem: " + (repAddr || "FAILED"));
