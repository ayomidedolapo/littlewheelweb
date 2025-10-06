// app/api/v1/agent/customers/[id]/vaults/[vaultId]/withdraw/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 45000);
const ROUTE_REV = "withdraw-init-R5";

/* ---------- Next-safe accessors ---------- */
async function getCookieStore() {
  const maybe = (cookiesFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}
async function getHeadersStore() {
  const maybe = (headersFn as any)();
  return typeof maybe?.then === "function" ? await maybe : maybe;
}

/* ---------- auth: prefer x-lw-auth, then Authorization, then cookies ---------- */
async function readBearer(req: NextRequest): Promise<string> {
  try {
    const jar = await getCookieStore();
    const hdrs = await getHeadersStore();

    const fromCookie =
      jar?.get?.("lw_token")?.value ||
      jar?.get?.("lw_auth")?.value ||
      jar?.get?.("authToken")?.value ||
      jar?.get?.("token")?.value ||
      jar?.get?.("session")?.value ||
      "";

    const fromAuth =
      (hdrs.get("authorization") || req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    const fromX =
      (hdrs.get("x-lw-auth") || req.headers.get("x-lw-auth") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() || "";

    return fromX || fromAuth || fromCookie || "";
  } catch {
    return (
      (req.headers.get("authorization") || "")
        .replace(/^Bearer\s+/i, "")
        .trim() ||
      (req.headers.get("x-lw-auth") || "").replace(/^Bearer\s+/i, "").trim() ||
      ""
    );
  }
}

function j(body: any, status = 200) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  return r;
}

function int(val: any) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}
function toKobo(naira: any) {
  const n = Number(naira);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

type ParamsShape =
  | Promise<{ id?: string; customerId?: string; vaultId?: string }>
  | { id?: string; customerId?: string; vaultId?: string };

/** Build several payload shapes to maximize upstream compatibility. */
function buildCandidateBodies(
  incoming: any,
  customerId: string,
  vaultId: string
) {
  const amountNaira =
    int(incoming?.amount) || int(incoming?.amountNaira) || int(incoming?.naira);
  const amountKobo = toKobo(amountNaira);

  const rawMethod = String(incoming?.method || "")
    .trim()
    .toUpperCase();
  const method =
    rawMethod === "BANK_TRANSFER" || rawMethod === "BANK"
      ? rawMethod
      : "BANK_TRANSFER";

  const withdrawalMethodId =
    incoming?.withdrawalMethodId ??
    incoming?.withdrawal_method_id ??
    incoming?.methodId ??
    null;

  const bankName =
    incoming?.bankName || incoming?.bank?.name || incoming?.bank || "";
  const bankCode =
    String(incoming?.bankCode ?? incoming?.bank?.code ?? "").trim() || "";
  const accountNumber =
    String(incoming?.accountNumber ?? incoming?.account ?? "").trim() || "";
  const accountName =
    String(incoming?.accountName ?? incoming?.name ?? "").trim() || "";

  // Some gateways want NIP channel naming or `channel` key:
  const channel = method === "BANK_TRANSFER" ? "NIP_TRANSFER" : method;

  const narration =
    (incoming?.narration || incoming?.remark || incoming?.description || "")
      .toString()
      .slice(0, 60) || "Vault withdrawal";

  const baseMeta = {
    source: "agent-app",
    ui_version: ROUTE_REV,
  };

  // A) Flat fields (previous)
  const A = {
    amount: amountKobo,
    currency: "NGN",
    method, // e.g., BANK_TRANSFER
    ...(withdrawalMethodId ? { withdrawalMethodId } : {}),
    ...(bankName || bankCode || accountNumber
      ? { bankName, bankCode, accountNumber, accountName }
      : {}),
    metadata: baseMeta,
    narration,
  };

  // B) Destination (nested)
  const B = {
    amount: amountKobo,
    currency: "NGN",
    method,
    ...(withdrawalMethodId ? { withdrawalMethodId } : {}),
    destination: {
      type: "BANK",
      scheme: "NIP",
      bankName: bankName || undefined,
      bankCode: bankCode || undefined,
      accountNumber: accountNumber || undefined,
      accountName: accountName || undefined,
    },
    metadata: baseMeta,
    narration,
  };

  // C) Channel + nested bank/account
  const C = {
    amount: amountKobo,
    amountInKobo: amountKobo, // <- many APIs prefer this explicit key
    currency: "NGN",
    channel, // NIP_TRANSFER
    debitSource: "VAULT", // <- makes the source explicit
    customerId, // <- context
    vaultId, // <- context
    ...(withdrawalMethodId ? { withdrawalMethodId } : {}),
    bank: {
      code: bankCode || undefined,
      name: bankName || undefined,
    },
    account: {
      number: accountNumber || undefined,
      name: accountName || undefined,
    },
    metadata: baseMeta,
    narration,
  };

  // D) Flat with method coerced to BANK (some validate this way)
  const D = {
    amount: amountKobo,
    amountInKobo: amountKobo,
    currency: "NGN",
    method: "BANK",
    debitSource: "VAULT",
    customerId,
    vaultId,
    ...(withdrawalMethodId ? { withdrawalMethodId } : {}),
    bankName,
    bankCode,
    accountNumber,
    accountName,
    narration,
    metadata: baseMeta,
  };

  // E) Strict minimal with only IDs (some backends require using a stored method only)
  const E = {
    amountInKobo: amountKobo,
    currency: "NGN",
    channel: "NIP_TRANSFER",
    debitSource: "VAULT",
    customerId,
    vaultId,
    ...(withdrawalMethodId ? { withdrawalMethodId } : {}),
    narration,
    metadata: baseMeta,
  };

  // F) Wrapper { request: { ... } } (odd but seen)
  const F = {
    request: { ...E },
  };

  return { amountKobo, candidates: [A, B, C, D, E, F] };
}

export async function POST(req: NextRequest, ctx: { params: ParamsShape }) {
  if (!API_BASE)
    return j({ success: false, message: "Missing BACKEND_API_URL" }, 500);

  const params =
    typeof (ctx.params as any)?.then === "function"
      ? await (ctx.params as any)
      : (ctx.params as any);
  const customerId = params.id || params.customerId;
  const vaultId = params.vaultId;

  if (!customerId || !vaultId) {
    return j({ success: false, message: "Missing customerId or vaultId" }, 400);
  }

  const token = await readBearer(req);
  if (!token)
    return j({ success: false, message: "Authentication required" }, 401);

  // read incoming
  let incoming: any = {};
  try {
    incoming = await req.json();
  } catch {}

  const { amountKobo, candidates } = buildCandidateBodies(
    incoming,
    String(customerId),
    String(vaultId)
  );
  if (!amountKobo) {
    return j(
      {
        success: false,
        message: "Amount required (naira).",
        hint: "Send e.g. { amount: 2500 } (₦2,500). Proxy converts to kobo.",
      },
      422
    );
  }

  const upstreamUrl = `${API_BASE}/agent/customers/${encodeURIComponent(
    String(customerId)
  )}/vaults/${encodeURIComponent(String(vaultId))}/withdraw/initialize`;

  // Timeout control
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

  const errors: Array<{ variant: string; status: number; body: any }> = [];

  try {
    const variants = [
      { name: "A-flat", body: candidates[0] },
      { name: "B-destination", body: candidates[1] },
      { name: "C-channel+nested", body: candidates[2] },
      { name: "D-bank-method", body: candidates[3] },
      { name: "E-id-only", body: candidates[4] },
      { name: "F-wrapper", body: candidates[5] },
    ];

    for (const v of variants) {
      const res = await fetch(upstreamUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          // send Bearer in BOTH headers
          Authorization: `Bearer ${token}`,
          "x-lw-auth": `Bearer ${token}`,
        },
        cache: "no-store",
        signal: ac.signal,
        body: JSON.stringify(v.body),
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      if (res.ok) {
        if (typeof payload === "string") {
          return new NextResponse(payload, {
            status: res.status,
            headers: {
              "Content-Type": ct || "application/json; charset=utf-8",
            },
          });
        }
        return j(payload, res.status);
      }

      errors.push({
        variant: v.name,
        status: res.status,
        body: payload,
      });
    }

    const top = errors[0];
    return j(
      {
        success: false,
        message:
          (top?.body?.message ||
            top?.body?.error ||
            "Validation failed (422)") + " — tried multiple payload shapes.",
        upstreamStatus: top?.status || 422,
        variantsTried: errors.map((e) => ({
          variant: e.variant,
          status: e.status,
          message:
            e.body?.message || e.body?.error || String(e.body).slice(0, 180),
          errors: e.body?.errors || e.body?.details || undefined,
        })),
        debugEcho: {
          received: incoming,
          amountKobo,
        },
      },
      422
    );
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return j(
      {
        success: false,
        message: aborted
          ? `Upstream timeout after ${TIMEOUT_MS}ms`
          : e?.message || "Upstream error",
      },
      aborted ? 504 : 502
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  return j({ message: "Not Found" }, 404);
}
