// app/api/v1/agent/customers/[id]/vaults/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies as cookiesFn, headers as headersFn } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = (process.env.BACKEND_API_URL || "").replace(/\/+$/, "");
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS ?? 90_000);
const ROUTE_REV = "vaults-minimal-auth-normalize-R4"; // ⬅ bump

/* ---------- util: safe accessors ---------- */
async function getCookieStore() {
  const m = (cookiesFn as any)();
  return typeof m?.then === "function" ? await m : m;
}
async function getHeadersStore() {
  const m = (headersFn as any)();
  return typeof m?.then === "function" ? await m : m;
}

function joinUpstream(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/v1") && p.startsWith("/v1"))
    return BASE + p.replace(/^\/v1/, "");
  return BASE + p;
}

function jsonOut(body: any, status = 200, extra?: Record<string, string>) {
  const r = NextResponse.json(body, { status });
  r.headers.set("X-Route-Rev", ROUTE_REV);
  if (extra) for (const [k, v] of Object.entries(extra)) r.headers.set(k, v);
  return r;
}

/** Return BOTH the raw token and Bearer form. Prefer Authorization header, then cookies. */
async function getAuthPieces(req: NextRequest) {
  const jar = await getCookieStore();
  const hdrs = await getHeadersStore();

  const explicit = (
    hdrs.get("authorization") ||
    req.headers.get("authorization") ||
    ""
  )
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cookieTok =
    jar?.get?.("lw_auth")?.value ||
    jar?.get?.("lw_token")?.value ||
    jar?.get?.("authToken")?.value ||
    jar?.get?.("token")?.value ||
    "";

  const raw = (explicit || cookieTok).trim();
  const bearer = raw ? `Bearer ${raw}` : "";
  return { raw, bearer };
}

/* ---------- util: timeout + one-retry ---------- */
async function fetchWithTimeoutRetry(
  url: string,
  init: RequestInit,
  timeoutMs = TIMEOUT_MS,
  retryOnceOn: ("timeout" | 502 | 503 | 504)[] = ["timeout", 502, 503, 504]
) {
  const attempt = async (): Promise<{
    res: Response;
    elapsed: number;
    aborted: boolean;
  }> => {
    const controller = new AbortController();
    const started = Date.now();
    const t = setTimeout(() => controller.abort("timeout"), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      return { res, elapsed: Date.now() - started, aborted: false };
    } finally {
      clearTimeout(t);
    }
  };

  let { res, elapsed, aborted } = await attempt().catch((e: any) => {
    return {
      res: new Response(null, {
        status: 599,
        statusText: e?.message || "Network error",
      }),
      elapsed: timeoutMs,
      aborted: e === "timeout" || e?.name === "AbortError",
    };
  });

  let retried = false;
  if (
    aborted ||
    retryOnceOn.includes(res.status as any) ||
    (res.status === 599 && retryOnceOn.includes("timeout"))
  ) {
    retried = true;
    await new Promise((r) => setTimeout(r, 300));
    const second = await attempt().catch((e: any) => ({
      res: new Response(null, {
        status: 599,
        statusText: e?.message || "Network error",
      }),
      elapsed: timeoutMs,
      aborted: e === "timeout" || e?.name === "AbortError",
    }));
    res = second.res;
    elapsed += second.elapsed;
    aborted = second.aborted;
  }

  return { res, elapsed, aborted, retried };
}

/* ---------- payload normalization (unchanged) ---------- */
type FreqUpper = "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
function jsToIsoDay(d: number) {
  return d === 0 ? 7 : d;
}

function coerceMinimalPayload(raw: any): {
  out: Record<string, any>;
  notes: string[];
} {
  const notes: string[] = [];
  const src = typeof raw === "object" && raw ? raw : {};
  const keep: Record<string, any> = {};

  const allowed = new Set([
    "name",
    "amount",
    "targetAmount",
    "duration",
    "frequency",
    "startDate",
    "dayOfWeek",
    "dayOfMonth",
  ]);
  for (const k of Object.keys(src))
    if (allowed.has(k)) keep[k] = src[k];
    else notes.push(`dropped:${k}`);

  let frequency: FreqUpper = String(
    keep.frequency || ""
  ).toUpperCase() as FreqUpper;
  if (!["ONCE", "DAILY", "WEEKLY", "MONTHLY"].includes(frequency)) {
    frequency = "ONCE";
    notes.push("defaulted:frequency=ONCE");
  }
  keep.frequency = frequency;

  const amountNum = Number(src.amount ?? 0);
  const targetNum = Number(src.targetAmount ?? (amountNum || 0));
  keep.amount = String(
    Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 0
  );
  keep.targetAmount = String(
    Number.isFinite(targetNum) && targetNum > 0 ? targetNum : keep.amount
  );

  if (typeof keep.name !== "string" || !keep.name.trim()) {
    keep.name = "Personal Vault – Once";
    notes.push("defaulted:name");
  }

  const duration = String(keep.duration || "ONE_MONTH").toUpperCase();
  const allowedDur = new Set([
    "ONE_MONTH",
    "TWO_MONTHS",
    "THREE_MONTHS",
    "SIX_MONTHS",
    "TWELVE_MONTHS",
  ]);
  keep.duration = allowedDur.has(duration) ? duration : "ONE_MONTH";
  if (keep.duration !== duration) notes.push("defaulted:duration=ONE_MONTH");

  const iso = (s: string) => (s || "").slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  keep.startDate = iso(keep.startDate || today);

  if (frequency === "WEEKLY") {
    let dow = Number(keep.dayOfWeek ?? NaN);
    if (!(dow >= 1 && dow <= 7)) {
      const d = new Date(keep.startDate);
      dow = jsToIsoDay(d.getDay());
      keep.dayOfWeek = dow;
      notes.push("inferred:dayOfWeek");
    }
    delete keep.dayOfMonth;
  } else if (frequency === "MONTHLY") {
    let dom = Number(keep.dayOfMonth ?? NaN);
    if (!(dom >= 1 && dom <= 28)) {
      const d = new Date(keep.startDate);
      dom = Math.min(Math.max(d.getDate(), 1), 28);
      keep.dayOfMonth = dom;
      notes.push("clamped:dayOfMonth(1..28)");
    }
    delete keep.dayOfWeek;
  } else {
    delete keep.dayOfWeek;
    delete keep.dayOfMonth;
  }

  return { out: keep, notes };
}

function maskToken(tok: string) {
  const raw = tok.replace(/^Bearer\s+/i, "");
  if (!raw) return "";
  if (raw.length <= 20) return "***";
  return `${raw.slice(0, 10)}…${raw.slice(-6)}`;
}

/* ================= GET list ================= */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await (typeof (ctx.params as any)?.then === "function"
      ? (ctx.params as any)
      : ctx.params);

    if (!BASE)
      return jsonOut(
        { success: false, message: "Missing BACKEND_API_URL" },
        500
      );
    if (!id)
      return jsonOut({ success: false, message: "Missing customer id" }, 400);

    const { raw, bearer } = await getAuthPieces(req);
    if (!raw) return jsonOut({ success: false, message: "Unauthorized" }, 401);

    const url = new URL(
      joinUpstream(`/agent/customers/${encodeURIComponent(id)}/vaults`)
    );
    req.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

    const { res, elapsed, aborted, retried } = await fetchWithTimeoutRetry(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: bearer, // Bearer <raw>
          "x-lw-auth": raw, // RAW token (no "Bearer ")
        },
        cache: "no-store",
      }
    );

    const text = await res.text();
    const out = new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
      },
    });
    out.headers.set("X-Route-Rev", ROUTE_REV);
    out.headers.set("X-Upstream-Elapsed", String(elapsed));
    out.headers.set("X-Upstream-Retried", retried ? "1" : "0");
    out.headers.set("X-Upstream-Aborted", aborted ? "1" : "0");
    return out;
  } catch (e: any) {
    const aborted = e?.name === "AbortError" || e === "timeout";
    return jsonOut(
      {
        success: false,
        message: aborted
          ? `timeout ${TIMEOUT_MS}ms`
          : e?.message || "Network error",
      },
      aborted ? 504 : 502
    );
  }
}

/* ================= POST create ================= */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await (typeof (ctx.params as any)?.then === "function"
    ? (ctx.params as any)
    : ctx.params);

  if (!BASE)
    return jsonOut({ success: false, message: "Missing BACKEND_API_URL" }, 500);
  if (!id)
    return jsonOut({ success: false, message: "Missing customer id" }, 400);

  const { raw, bearer } = await getAuthPieces(req);
  if (!raw) return jsonOut({ success: false, message: "Unauthorized" }, 401);

  let rawBody: any = {};
  try {
    const text = await req.text();
    rawBody = text ? JSON.parse(text) : {};
  } catch {
    rawBody = {};
  }
  const { out: normalized, notes } = coerceMinimalPayload(rawBody);
  const body = JSON.stringify(normalized);

  const url = joinUpstream(`/agent/customers/${encodeURIComponent(id)}/vaults`);
  const { res, elapsed, aborted, retried } = await fetchWithTimeoutRetry(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: bearer, // Bearer <raw>
      "x-lw-auth": raw, // RAW token
    },
    body,
    cache: "no-store",
  });

  const text = await res.text();

  if (!res.ok) {
    let upstreamMsg = text;
    try {
      const j = JSON.parse(text || "{}");
      upstreamMsg = j?.message || j?.error || text || `HTTP ${res.status}`;
    } catch {}

    return jsonOut(
      {
        success: false,
        where: "upstream",
        message: upstreamMsg,
        upstreamStatus: res.status,
        debug: {
          url,
          payload: normalized,
          sanitizeNotes: notes,
          sentHeaders: { Authorization: maskToken(bearer), "x-lw-auth": "***" },
        },
      },
      res.status,
      {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "X-Upstream-Elapsed": String(elapsed),
        "X-Upstream-Retried": retried ? "1" : "0",
        "X-Upstream-Aborted": aborted ? "1" : "0",
        "X-Route-Rev": ROUTE_REV,
      }
    );
  }

  const ok = new NextResponse(text, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
  ok.headers.set("X-Route-Rev", ROUTE_REV);
  ok.headers.set("X-Upstream-Elapsed", String(elapsed));
  ok.headers.set("X-Upstream-Retried", retried ? "1" : "0");
  ok.headers.set("X-Upstream-Aborted", aborted ? "1" : "0");
  return ok;
}
