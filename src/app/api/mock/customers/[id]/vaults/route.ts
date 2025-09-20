// /app/api/mock/customers/[id]/vaults/route.ts
import { NextResponse } from "next/server";
import { mockDb } from "../../../../../../lib/vault/mockDb";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json({
    success: true,
    data: mockDb.listVaults(params.id),
  });
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name, targetAmount } = await req.json();
  const v = mockDb.createVault(
    params.id,
    name,
    Number(targetAmount) || undefined
  );
  return NextResponse.json({ success: true, data: v }, { status: 201 });
}
