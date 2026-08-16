// Verifies the challenge-bond fix on the redeployed EscrowAdjudicator: a
// challenger's bond must come back to them (or be visibly forfeited) after
// resolve(), not vanish into the contract forever.
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
const ESCROW_ADDRESS = "0xcC2F11Aa3971195BBBA9696CDe6283aa54a196cE";

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

const funder = createAccount(OWNER_KEY);
const funderClient = createClient({ chain: testnetBradbury, account: funder });

const providerAccount = createAccount(generatePrivateKey());
const providerClient = createClient({ chain: testnetBradbury, account: providerAccount });

const challengerAccount = createAccount(generatePrivateKey());
const challengerClient = createClient({ chain: testnetBradbury, account: challengerAccount });

console.log(`Funder:     ${funder.address}`);
console.log(`Provider:   ${providerAccount.address}`);
console.log(`Challenger: ${challengerAccount.address}`);

console.log("\nFunding provider + challenger...");
await waitTx(funderClient, await funderClient.sendTransaction({ to: providerAccount.address, value: 10n }), "fund provider");
await waitTx(funderClient, await funderClient.sendTransaction({ to: challengerAccount.address, value: 210n }), "fund challenger");

console.log("\ncreate_escrow (criteria designed to be judged insufficient)...");
const createHash = await funderClient.writeContract({
  address: ESCROW_ADDRESS,
  functionName: "create_escrow",
  args: [providerAccount.address, "Deliver a 500-word summary of the top 3 cryptocurrencies by market cap.", "2099-01-01", "text"],
  value: 500n,
});
await waitTx(funderClient, createHash, "create_escrow");
const count = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow_count", args: [] });
const escrowId = `ESC-${count - 1}`;
console.log(`  ${escrowId}`);

console.log("\naccept_escrow + submit thin evidence (one sentence, no real content)...");
await waitTx(providerClient, await providerClient.writeContract({ address: ESCROW_ADDRESS, functionName: "accept_escrow", args: [escrowId], value: 0n }), "accept");
await waitTx(providerClient, await providerClient.writeContract({ address: ESCROW_ADDRESS, functionName: "submit_evidence", args: [escrowId, "done", []], value: 0n }), "submit_evidence");

console.log("\nchallenge with a 200 cGEN bond...");
const challengerBalanceBefore = await funderClient.getBalance({ address: challengerAccount.address });
const challengeHash = await challengerClient.writeContract({
  address: ESCROW_ADDRESS,
  functionName: "challenge",
  args: [escrowId, "The evidence is a single word, not a 500-word summary."],
  value: 200n,
});
await waitTx(challengerClient, challengeHash, "challenge");

console.log("\nresolve...");
await waitTx(funderClient, await funderClient.writeContract({ address: ESCROW_ADDRESS, functionName: "resolve", args: [escrowId], value: 0n }), "resolve");

const escrow = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_escrow", args: [escrowId] });
console.log(`  outcome=${escrow.outcome} released=${escrow.released_amount}`);

const challenges = await funderClient.readContract({ address: ESCROW_ADDRESS, functionName: "get_challenges", args: [escrowId, 0, 10] });
console.log(`  challenge record:`, JSON.stringify(challenges));

const challengerBalanceAfter = await funderClient.getBalance({ address: challengerAccount.address });
const delta = challengerBalanceAfter - challengerBalanceBefore;
console.log(`  challenger balance delta: ${delta} (started ${challengerBalanceBefore}, ended ${challengerBalanceAfter})`);

// With thin evidence, outcome should be clawback/partial -> challenge vindicated -> bond refunded.
// Regardless of which branch fires, the KEY assertion is: the bond is NOT
// simply stuck. Either the challenger's balance rose by ~200 (minus gas) or
// challenges[0].refunded is explicitly false (forfeited, not lost).
const refundedFlag = challenges[0]?.refunded;
const looksRefunded = delta > 0n; // balance went up despite gas cost
console.log(`  refunded flag = ${refundedFlag}, balance increased = ${looksRefunded}`);
assert(refundedFlag === true || refundedFlag === false, "challenge record has an explicit refunded flag (not undefined/stuck)");
if (escrow.outcome !== "full_release") {
  assert(looksRefunded, "challenger's balance increased after a vindicated challenge (bond was refunded, not stuck)");
  assert(refundedFlag === true, "challenge record shows refunded=true");
} else {
  assert(refundedFlag === false, "challenge record shows refunded=false (forfeited to provider, accounted for, not stuck)");
}

console.log("\nBOND-FIX VERIFICATION PASSED");
