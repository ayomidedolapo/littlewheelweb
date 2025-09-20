// /app/api/mock/vaults/[vaultId]/deposit/route.ts
import { NextResponse } from "next/server";
import { mockDb } from "../../../../../../lib/vault/mockDb";

export async function POST(
  req: Request,
  { params }: { params: { vaultId: string } }
) {
  const { amount } = await req.json();
  const { vault, txn } = mockDb.deposit(params.vaultId, Number(amount));
  return NextResponse.json(
    { success: true, data: { vault, txn } },
    { status: 201 }
  );
}
