// COMPAX deployment script — Bradbury testnet
// Pattern: OSSure (YoneCode/OSSure) — genlayer-js deployContract, not CLI
// Usage: ACCOUNT_PRIVATE_KEY=0x... node deploy/deploy.mjs
// Or:    create deploy/.env with ACCOUNT_PRIVATE_KEY=0x...

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env from deploy/ or repo root
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
console.error(`Deployer: ${account.address}`);

const client = createClient({
  chain: testnetBradbury,
  account,
});

async function deployContract(name, filePath, args = []) {
  const code = readFileSync(join(__dir, "..", filePath), "utf8");
  console.error(`\n[${name}] Deploying...`);

  let hash;
  try {
    hash = await client.deployContract({
      code,
      args,
    });
  } catch (e) {
    console.error(`[${name}] Deploy failed: ${e.message}`);
    throw e;
  }

  console.error(`[${name}] tx hash: ${hash}`);
  console.error(`[${name}] Waiting for ACCEPTED...`);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 60,
  });

  // On Bradbury, a deploy tx's `recipient` IS the new contract address.
  const address =
    receipt?.recipient ||
    receipt?.data?.contract_address ||
    receipt?.contract_address ||
    receipt?.contractAddress ||
    receipt?.data?.result;

  if (!address) {
    console.error(`[${name}] Receipt:`, JSON.stringify(receipt, null, 2));
    throw new Error(`[${name}] Could not extract contract address from receipt`);
  }

  console.error(`[${name}] Deployed at: ${address}`);
  return address;
}

const VERIFY_METHODS = {
  EconomicEvents: "get_event_count",
  ReputationSystem: null, // all views take args — verified via can_claim_faucet
  LendingMarket: "get_loan_count",
  BuilderFunding: "get_total_allocated",
  PredictionMarkets: "get_total_volume",
  VaultManager: "get_active_vault_count",
  StakingReserve: "get_total_staked",
};

async function verifyContract(name, address) {
  const method = VERIFY_METHODS[name];
  if (!method) {
    // ReputationSystem — all views need an address arg; verify with can_claim_faucet
    try {
      await client.readContract({ address, functionName: "can_claim_faucet", args: [account.address] });
      console.error(`[${name}] ✓ readable`);
      return true;
    } catch (e) {
      console.error(`[${name}] ✗ not yet readable: ${e.message}`);
      return false;
    }
  }
  console.error(`[${name}] Verifying via ${method}...`);
  try {
    const result = await client.readContract({ address, functionName: method, args: [] });
    console.error(`[${name}] ✓ readable — result: ${result}`);
    return true;
  } catch (e) {
    console.error(`[${name}] ✗ not yet readable: ${e.message}`);
    return false;
  }
}

const contracts = {
  EconomicEvents: "contracts/EconomicEvents.py",
  ReputationSystem: "contracts/ReputationSystem.py",
  LendingMarket: "contracts/LendingMarket.py",
  BuilderFunding: "contracts/BuilderFunding.py",
  PredictionMarkets: "contracts/PredictionMarkets.py",
  VaultManager: "contracts/VaultManager.py",
  StakingReserve: "contracts/StakingReserve.py",
};

const addresses = {};

for (const [name, filePath] of Object.entries(contracts)) {
  try {
    const addr = await deployContract(name, filePath);
    addresses[name] = addr;
    await verifyContract(name, addr);
  } catch (e) {
    console.error(`FAILED: ${name} — ${e.message}`);
    addresses[name] = "FAILED";
  }
}

console.error("\n─── DEPLOYMENT SUMMARY ───");
for (const [name, addr] of Object.entries(addresses)) {
  console.error(`${name}: ${addr}`);
}

// Write addresses to deploy/addresses.json for easy updating contracts.ts
writeFileSync(
  join(__dir, "addresses.json"),
  JSON.stringify(addresses, null, 2)
);
console.error("\nAddresses saved to deploy/addresses.json");

// Also print the contracts.ts snippet
console.log("\nexport const CONTRACTS = {");
for (const [name, addr] of Object.entries(addresses)) {
  console.log(`  ${name}: "${addr}" as \`0x\${string}\`,`);
}
console.log("} as const;");
