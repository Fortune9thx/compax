// End-to-end critical-path test: the Performance Escrow lifecycle, the hero
// flow of the product. Creates a real escrow, has a second real account
// accept it and submit thin evidence, resolves it via live AI adjudication,
// and asserts on real on-chain state at every step. Costs real testnet gas
// and locks/refunds a small amount of GEN.
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

const ESCROW_ADDRESS = "0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE";
const REPUTATION_ADDRESS = "0x3E69915B7Bb66Bc4b85733113E8021c62e05298b";

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  [pass] ${msg}`);
}

async function waitTx(client, hash, label) {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName || tx?.status);
    if (status.includes("REVERT") || status.includes("UNDETERMINED") || status.includes("CANCEL")) {
      throw new Error(`${label} failed: ${status}`);
    }
    if (status.includes("ACCEPT") || status.includes("FINAL")) {
      const exec = String(tx?.txExecutionResultName || "");
      if (exec === "FINISHED_WITH_ERROR") throw new Error(`${label} reverted at execution: ${JSON.stringify(tx)}`);
      return tx;
    }
  }
  throw new Error(`${label}: no terminal status after polling`);
}

const funderAccount = createAccount(OWNER_KEY);
const funderClient = createClient({ chain: testnetBradbury, account: funderAccount });

const providerKey = generatePrivateKey();
const providerAccount = createAccount(providerKey);
const providerClient = createClient({ chain: testnetBradbury, account: providerAccount });

console.log(`Funder:   ${funderAccount.address}`);
console.log(`Provider: ${providerAccount.address} (fresh)`);

console.log("\n[1/6] Funding provider with gas...");
const fundHash = await funderClient.sendTransaction({ to: providerAccount.address, value: 10n });
await waitTx(funderClient, fundHash, "fund provider");

console.log("\n[2/6] create_escrow...");
const criteria = "Reply with the single word 'delivered' and nothing else.";
const amount = 500n;
const createHash = await funderClient.writeContract({
  address: ESCROW_ADDRESS,
  functionName: "create_escrow",
  args: [providerAccount.address, criteria, "2099-01-01", "text"],
  value: amount,
});
await waitTx(funderClient, createHash, "create_escrow");
const count = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow_count", args: [] });
const escrowId = `ESC-${count - 1}`;
console.log(`  created ${escrowId}`);

let escrow = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow", args: [escrowId] });
assert(escrow.status === "open", `escrow ${escrowId} status is "open" after creation`);
assert(escrow.amount === Number(amount), `locked amount is ${amount}`);

console.log("\n[3/6] accept_escrow (provider)...");
const acceptHash = await providerClient.writeContract({ address: ESCROW_ADDRESS, functionName: "accept_escrow", args: [escrowId], value: 0n });
await waitTx(providerClient, acceptHash, "accept_escrow");
escrow = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow", args: [escrowId] });
assert(escrow.status === "accepted", "status transitions to accepted");

console.log("\n[4/6] submit_evidence (provider)...");
const evidenceHash = await providerClient.writeContract({
  address: ESCROW_ADDRESS,
  functionName: "submit_evidence",
  args: [escrowId, "delivered", []],
  value: 0n,
});
await waitTx(providerClient, evidenceHash, "submit_evidence");
escrow = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow", args: [escrowId] });
assert(escrow.status === "evidence_submitted", "status transitions to evidence_submitted");
assert(escrow.evidence.length === 1, "evidence array has one entry");

console.log("\n[5/6] resolve (live AI adjudication, 30-90s)...");
const resolveHash = await funderClient.writeContract({ address: ESCROW_ADDRESS, functionName: "resolve", args: [escrowId], value: 0n });
await waitTx(funderClient, resolveHash, "resolve");
escrow = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow", args: [escrowId] });
assert(escrow.status === "resolved", "status transitions to resolved");
assert(["full_release", "partial", "clawback"].includes(escrow.outcome), `outcome "${escrow.outcome}" is one of the three valid values`);
assert(escrow.released_amount >= 0 && escrow.released_amount <= Number(amount), "released_amount is within [0, locked]");
assert(typeof escrow.ai_reasoning === "string" && escrow.ai_reasoning.length > 0, "ai_reasoning is present and non-empty");
console.log(`  outcome=${escrow.outcome} released=${escrow.released_amount}/${amount}`);

console.log("\n[6/6] claim reputation update (funder, a real party)...");
const claimHash = await funderClient.writeContract({
  address: REPUTATION_ADDRESS,
  functionName: "record_from_escrow",
  args: [ESCROW_ADDRESS, escrowId],
  value: 0n,
});
await waitTx(funderClient, claimHash, "record_from_escrow");
const claimKey = `escrow_${ESCROW_ADDRESS.toLowerCase()}_${escrowId}`;
const claimed = await funderClient.readContract({ address: REPUTATION_ADDRESS, functionName: "is_claimed", args: [claimKey] });
assert(claimed === true, "is_claimed is true after the claim");

let doubleClaimRejected = false;
try {
  const dup = await funderClient.writeContract({ address: REPUTATION_ADDRESS, functionName: "record_from_escrow", args: [ESCROW_ADDRESS, escrowId], value: 0n });
  const tx = await waitTx(funderClient, dup, "duplicate record_from_escrow");
  doubleClaimRejected = false;
} catch {
  doubleClaimRejected = true;
}
assert(doubleClaimRejected, "a second claim on the same escrow is rejected (already_claimed)");

console.log("\nALL E2E ASSERTIONS PASSED");
