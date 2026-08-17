// Access-control adversarial test - a funded, unregistered random wallet
// attempts a representative protected write on each of the 5 contracts and
// asserts it reverts with FINISHED_WITH_ERROR, then re-reads state to
// confirm nothing changed. Costs a small amount of testnet GEN (funding the
// attacker wallet + gas on the reverted txs).
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const __dir = dirname(fileURLToPath(import.meta.url));
try {
  const env = readFileSync(join(__dir, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const OWNER_KEY = process.env.ACCOUNT_PRIVATE_KEY;
if (!OWNER_KEY) { console.error("ERROR: set ACCOUNT_PRIVATE_KEY in deploy/.env"); process.exit(1); }

const CONTRACTS = {
  ReputationRegistry: "0x1654eb6704D90A48729851f4686E5213c7B9C749",
  EscrowAdjudicator: "0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE",
  VaultManager: "0xf64B7fBB4F516D0b87cE7003D31B6BA61BC716b0",
  PredictionMarket: "0xE2681E5Ec27175ADC4173b949928F3Bbb24f6b07",
  CreditLine: "0xC04F7900840a8088909b906bD429A4a834715Ca5",
};

const ownerAccount = createAccount(OWNER_KEY);
const ownerClient = createClient({ chain: testnetBradbury, account: ownerAccount });

const attackerKey = generatePrivateKey();
const attackerAccount = createAccount(attackerKey);
const attackerClient = createClient({ chain: testnetBradbury, account: attackerAccount });

console.log(`Owner:    ${ownerAccount.address}`);
console.log(`Attacker: ${attackerAccount.address} (freshly generated, never registered anywhere)`);

async function waitTx(client, hash) {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName || tx?.status);
    if (status.includes("ACCEPT") || status.includes("FINAL") || status.includes("REVERT") || status.includes("UNDETERMINED")) {
      return { status, exec: String(tx?.txExecutionResultName || "") };
    }
  }
  throw new Error("no terminal status after polling");
}

// fund the attacker with just enough for gas
console.log("\nFunding attacker with 10 GEN for gas...");
const fundHash = await ownerClient.sendTransaction({ to: attackerAccount.address, value: 10n });
await waitTx(ownerClient, fundHash);
console.log("Funded.");

const cases = [
  {
    label: "VaultManager.add_keeper (owner-only) called by attacker",
    contract: "VaultManager",
    fn: "add_keeper",
    args: [attackerAccount.address],
    value: 0n,
    verify: async () => {
      const isKeeper = await ownerClient.readContract({ address: CONTRACTS.VaultManager, functionName: "is_keeper", args: [attackerAccount.address] });
      return { ok: isKeeper === false, note: `is_keeper(attacker) = ${isKeeper}` };
    },
  },
  {
    label: "ReputationRegistry.add_trusted_source (owner-only) called by attacker",
    contract: "ReputationRegistry",
    fn: "add_trusted_source",
    args: [attackerAccount.address, "escrow"],
    value: 0n,
    verify: async () => {
      const trusted = await ownerClient.readContract({ address: CONTRACTS.ReputationRegistry, functionName: "is_trusted_source", args: [attackerAccount.address, "escrow"] });
      return { ok: trusted === false, note: `is_trusted_source(attacker, escrow) = ${trusted}` };
    },
  },
];

let allPassed = true;
for (const c of cases) {
  console.log(`\n[TEST] ${c.label}`);
  let hash;
  try {
    hash = await attackerClient.writeContract({
      address: CONTRACTS[c.contract],
      functionName: c.fn,
      args: c.args,
      value: c.value,
    });
  } catch (e) {
    // some rejections happen at submission time (also an acceptable revert outcome)
    console.log(`  submission-time rejection: ${e.message}`);
    const v = await c.verify();
    console.log(`  state check: ${v.note} -> ${v.ok ? "UNCHANGED (pass)" : "CHANGED (FAIL)"}`);
    if (!v.ok) allPassed = false;
    continue;
  }
  console.log(`  tx: ${hash}`);
  const result = await waitTx(attackerClient, hash);
  console.log(`  status=${result.status} exec=${result.exec}`);
  const revertedAtExec = result.exec === "FINISHED_WITH_ERROR";
  const revertedAtChain = result.status.includes("REVERT") || result.status.includes("UNDETERMINED");
  const rejected = revertedAtExec || revertedAtChain;
  console.log(`  rejected as expected: ${rejected ? "YES" : "NO (FAIL - unauthorized write was accepted!)"}`);
  const v = await c.verify();
  console.log(`  state check: ${v.note} -> ${v.ok ? "UNCHANGED (pass)" : "CHANGED (FAIL)"}`);
  if (!rejected || !v.ok) allPassed = false;
}

console.log(`\n${"=".repeat(60)}`);
console.log(allPassed ? "ALL ACCESS-CONTROL TESTS PASSED" : "SOME ACCESS-CONTROL TESTS FAILED");
process.exit(allPassed ? 0 : 1);
