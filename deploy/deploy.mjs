// Compax v2 deployment script - Bradbury testnet
// Usage: ACCOUNT_PRIVATE_KEY=0x... node deploy/deploy.mjs
// Or:    create deploy/.env with ACCOUNT_PRIVATE_KEY=0x...
//
// All 5 contracts are independent (no constructor args, no cross-calls at
// deploy time). After deploying, register the adjudicator contracts as
// trusted sources on ReputationRegistry (see the block at the bottom) - // without that, record_from_escrow/record_from_prediction/record_from_credit
// will reject every claim.

import { readFileSync, writeFileSync } from "fs";
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

const PRIVATE_KEY = process.env.ACCOUNT_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("ERROR: set ACCOUNT_PRIVATE_KEY in deploy/.env or environment");
  process.exit(1);
}

const account = createAccount(PRIVATE_KEY);
console.error(`Deployer/owner: ${account.address}`);

const client = createClient({ chain: testnetBradbury, account });

function isSuccess(exec) {
  return exec === "FINISHED_WITH_RETURN" || exec === "FINISHED" || (exec && exec.includes("SUCCESS"));
}

async function deployAndWait(name, filePath) {
  const code = readFileSync(join(__dir, "..", filePath), "utf8");
  console.error(`\n[${name}] Deploying...`);
  const hash = await client.deployContract({ code, args: [] });
  console.error(`[${name}] tx: ${hash}`);

  let addr = null;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    let tx;
    try { tx = await client.getTransaction({ hash }); } catch { continue; }
    const status = String(tx?.statusName || tx?.status);
    addr = tx?.recipient || addr;
    if (status.includes("REVERT") || status.includes("UNDETERMINED") || status.includes("CANCEL")) {
      throw new Error(`[${name}] deploy failed: ${status}`);
    }
    if (addr && (status.includes("ACCEPT") || status.includes("FINAL"))) break;
  }
  if (!addr) throw new Error(`[${name}] no address after polling`);
  console.error(`[${name}] deployed: ${addr}`);
  return addr;
}

const VERIFY_METHODS = {
  ReputationRegistry: null, // get_score needs an address arg
  EscrowAdjudicator: "get_escrow_count",
  VaultManager: "get_vault_count",
  PredictionMarket: "get_market_count",
  CreditLine: "get_line_count",
};

async function verifyContract(name, address) {
  const method = VERIFY_METHODS[name];
  try {
    if (!method) {
      await client.readContract({ address, functionName: "get_score", args: [account.address] });
    } else {
      const result = await client.readContract({ address, functionName: method, args: [] });
      console.error(`[${name}] ✓ readable - ${method} => ${result}`);
      return true;
    }
    console.error(`[${name}] ✓ readable`);
    return true;
  } catch (e) {
    console.error(`[${name}] ✗ not yet readable: ${e.message}`);
    return false;
  }
}

const contracts = {
  ReputationRegistry: "contracts/ReputationRegistry.py",
  EscrowAdjudicator: "contracts/EscrowAdjudicator.py",
  VaultManager: "contracts/VaultManager.py",
  PredictionMarket: "contracts/PredictionMarket.py",
  CreditLine: "contracts/CreditLine.py",
};

const addresses = {};
for (const [name, filePath] of Object.entries(contracts)) {
  try {
    const addr = await deployAndWait(name, filePath);
    addresses[name] = addr;
    await verifyContract(name, addr);
  } catch (e) {
    console.error(`FAILED: ${name} - ${e.message}`);
    addresses[name] = "FAILED";
  }
}

console.error("\n─── DEPLOYMENT SUMMARY ───");
for (const [name, addr] of Object.entries(addresses)) {
  console.error(`${name}: ${addr}`);
}

writeFileSync(join(__dir, "addresses.json"), JSON.stringify(addresses, null, 2));
console.error("\nAddresses saved to deploy/addresses.json");

console.log("\nexport const CONTRACTS = {");
for (const [name, addr] of Object.entries(addresses)) {
  console.log(`  ${name}: "${addr}" as \`0x\${string}\`,`);
}
console.log("} as const;");

// ── register trusted sources on ReputationRegistry ──────────────────────
if (addresses.ReputationRegistry !== "FAILED") {
  console.error("\nRegistering trusted sources on ReputationRegistry...");
  const registrations = [
    ["EscrowAdjudicator", "escrow"],
    ["PredictionMarket", "prediction"],
    ["CreditLine", "credit"],
  ];
  for (const [contractName, category] of registrations) {
    if (addresses[contractName] === "FAILED") continue;
    try {
      const hash = await client.writeContract({
        address: addresses.ReputationRegistry,
        functionName: "add_trusted_source",
        args: [addresses[contractName], category],
        value: 0n,
      });
      console.error(`  add_trusted_source(${contractName}, ${category}) tx: ${hash}`);
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        let tx;
        try { tx = await client.getTransaction({ hash }); } catch { continue; }
        const st = String(tx?.statusName || tx?.status);
        if (st.includes("ACCEPT") || st.includes("FINAL")) break;
      }
    } catch (e) {
      console.error(`  FAILED to register ${contractName}: ${e.message}`);
    }
  }
  console.error("Done. Verify with is_trusted_source(address, category) before relying on it - registration has propagation lag on Bradbury.");
}
