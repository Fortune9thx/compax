import { NextRequest, NextResponse } from "next/server";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export async function POST(req: NextRequest) {
  try {
    const { contractAddress, functionName, args, value } = await req.json();

    const pk = process.env.DEMO_PRIVATE_KEY as `0x${string}` | undefined;
    if (!pk) {
      return NextResponse.json({ error: "DEMO_PRIVATE_KEY not set in .env.local" }, { status: 500 });
    }

    const account = createAccount(pk);
    const client = createClient({ chain: testnetBradbury, account });

    const hash = await client.writeContract({
      address: contractAddress as `0x${string}`,
      functionName,
      args: args ?? [],
      value: value ? BigInt(value) : BigInt(0),
    });

    const receipt = await client.waitForTransactionReceipt({
      hash,
      status: TransactionStatus.FINALIZED,
    });

    // The contract's return value is in the receipt — extract it
    const result = (receipt as Record<string, unknown>).result ?? null;

    return NextResponse.json({ txHash: hash, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
