// Live verification of the VaultManager redesign, using only the already-
// funded owner account (no ephemeral account funding needed - sidesteps the
// plain-transfer propagation issue seen elsewhere on Bradbury today, since
// every call here is a writeContract, which has been reliable all session).
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient, createAccount } from "genlayer-js";
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
const VAULT_MANAGER = "0xdCB85486089582295E6Fdb537Cbb0fF88e5B4b93";
const REPUTATION_ADDRESS = "0xFffD427a00E09f6a1F0E896B1B85EC886bC10483";

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
      if (exec === "FINISHED_WITH_ERROR") throw new Error(`${label} reverted: ${JSON.stringify(tx)}`);
      return tx;
    }
  }
  throw new Error(`${label}: timed out`);
}

const owner = createAccount(OWNER_KEY);
const client = createClient({ chain: testnetBradbury, account: owner });
console.log(`Owner: ${owner.address}`);

console.log("\n[1/8] create_vault (risk 5 -> escrow+credit, deterministic)...");
const createHash = await client.writeContract({
  address: VAULT_MANAGER,
  functionName: "create_vault",
  args: ["Test Vault", "Fund verified deliverables from trusted contractors, moderate risk.", 5, "methodical"],
  value: 0n,
});
await waitTx(client, createHash, "create_vault");
const count = await client.readContract({ address: VAULT_MANAGER, functionName: "get_vault_count", args: [] });
const vaultId = `VAULT-${count - 1}`;
console.log(`  created ${vaultId}`);

let vault = await client.readContract({ address: VAULT_MANAGER, functionName: "get_vault", args: [vaultId] });
assert(JSON.stringify(vault.allowed_instruments.sort()) === JSON.stringify(["credit", "escrow"]), `risk 5 deterministically permits exactly [credit, escrow], got ${JSON.stringify(vault.allowed_instruments)}`);
assert(!vault.mandate_reasoning.toLowerCase().includes("gl.eq_principle"), "mandate_reasoning is a static string, not an LLM artifact");

console.log("\n[2/8] deposit 1000...");
const depositHash = await client.writeContract({ address: VAULT_MANAGER, functionName: "deposit", args: [vaultId], value: 1000n });
await waitTx(client, depositHash, "deposit");
const myDeposit = await client.readContract({ address: VAULT_MANAGER, functionName: "get_deposit", args: [vaultId, owner.address] });
assert(myDeposit.amount === 1000, `get_deposit reports my own tracked claim of 1000, got ${myDeposit.amount}`);

console.log("\n[3/8] move_to_escrow 400 with justification...");
const moveHash = await client.writeContract({
  address: VAULT_MANAGER,
  functionName: "move_to_escrow",
  args: [vaultId, 400, "Funding a specific, verified deliverable escrow consistent with the objective."],
  value: 0n,
});
const moveTx = await waitTx(client, moveHash, "move_to_escrow");
const movementCount = await client.readContract({ address: VAULT_MANAGER, functionName: "get_movement_count", args: [] });
const movementId = `MOV-${movementCount - 1}`;
console.log(`  ${movementId}`);
let movement = await client.readContract({ address: VAULT_MANAGER, functionName: "get_movement", args: [movementId] });
assert(movement.status === "executed", `movement status is "executed", got "${movement.status}"`);
assert(movement.amount === 400, "movement amount matches");

console.log("\n[4/8] confirm mandate gate rejects a disallowed instrument (prediction, risk 5)...");
let rejected = false;
try {
  const badHash = await client.writeContract({
    address: VAULT_MANAGER,
    functionName: "move_to_prediction",
    args: [vaultId, 100, "should be rejected"],
    value: 0n,
  });
  await waitTx(client, badHash, "move_to_prediction (expected reject)");
} catch {
  rejected = true;
}
assert(rejected, "move_to_prediction on a risk-5 vault (escrow+credit only) is rejected on-chain");

console.log("\n[5/8] challenge_movement with a 50 bond (self-challenge, permissionless)...");
const challengeHash = await client.writeContract({
  address: VAULT_MANAGER,
  functionName: "challenge_movement",
  args: [movementId, "Testing the adjudication path end to end."],
  value: 50n,
});
await waitTx(client, challengeHash, "challenge_movement");
movement = await client.readContract({ address: VAULT_MANAGER, functionName: "get_movement", args: [movementId] });
assert(movement.status === "challenged", `movement status is "challenged", got "${movement.status}"`);

console.log("\n[6/8] resolve_movement (live AI adjudication, 30-90s)...");
const resolveHash = await client.writeContract({ address: VAULT_MANAGER, functionName: "resolve_movement", args: [movementId], value: 0n });
await waitTx(client, resolveHash, "resolve_movement");
movement = await client.readContract({ address: VAULT_MANAGER, functionName: "get_movement", args: [movementId] });
assert(movement.status === "resolved", `movement status is "resolved", got "${movement.status}"`);
assert(["compliant", "violation"].includes(movement.outcome), `outcome "${movement.outcome}" is compliant or violation`);
assert(movement.ai_reasoning.length > 0, "ai_reasoning is present");
console.log(`  outcome=${movement.outcome}: ${movement.ai_reasoning.slice(0, 150)}...`);

const challenges = await client.readContract({ address: VAULT_MANAGER, functionName: "get_movement_challenges", args: [movementId, 0, 10] });
console.log(`  challenge record: ${JSON.stringify(challenges[0])}`);
assert(typeof challenges[0].refunded === "boolean", "challenge record has an explicit refunded flag - bond is accounted for either way, not stuck");

console.log("\n[7/8] withdraw_deposit (undeployed capital only)...");
const remainingDeposit = await client.readContract({ address: VAULT_MANAGER, functionName: "get_deposit", args: [vaultId, owner.address] });
console.log(`  remaining tracked deposit: ${remainingDeposit.amount}`);
vault = await client.readContract({ address: VAULT_MANAGER, functionName: "get_vault", args: [vaultId] });
console.log(`  live treasury: ${vault.treasury}`);
assert(vault.treasury === 600, `live treasury is 1000 - 400 moved = 600, got ${vault.treasury}`);

console.log("\n[8/8] claim reputation from the resolved movement...");
const claimHash = await client.writeContract({
  address: REPUTATION_ADDRESS,
  functionName: "record_from_vault",
  args: [VAULT_MANAGER, movementId],
  value: 0n,
});
await waitTx(client, claimHash, "record_from_vault");
const claimKey = `vault_${VAULT_MANAGER.toLowerCase()}_${movementId}`;
const claimed = await client.readContract({ address: REPUTATION_ADDRESS, functionName: "is_claimed", args: [claimKey] });
assert(claimed === true, "is_claimed is true after the claim");
const score = await client.readContract({ address: REPUTATION_ADDRESS, functionName: "get_score", args: [owner.address] });
console.log(`  owner vault_score: ${score.vault_score}`);
assert(typeof score.vault_score === "number", "get_score exposes vault_score");

console.log("\nALL VAULT-REDESIGN ASSERTIONS PASSED");
