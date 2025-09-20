// /app/api/mock/customers/route.ts
import { NextResponse } from "next/server";
import { mockDb } from "../../../../lib/vault/mockDb";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: mockDb.listCustomers() });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "err" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const c = mockDb.createCustomer({
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
    });
    return NextResponse.json({ success: true, data: c }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message || "err" },
      { status: 400 }
    );
  }
}
