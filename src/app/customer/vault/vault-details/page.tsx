/* app/customer/vault/vault-details/page.tsx */
"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------- helpers ---------- */
type APIVault = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: number;
  amount?: number; // daily amount
  currentAmount?: number; // if present in list
};

type VaultRow = {
  id: string; // REAL api id used for fetching/routing
  name: string;
  daily: number;
  current: number;
  target: number;
};

const NGN2 = (n: number) =>
  `₦${(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function slugify(s: string) {
  return (s || "vault")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Avoid conflicts with static routes like /customer/vault/personal-vault */
function makeSafeSlug(name: string, id: string) {
  const base = slugify(name || "vault");
  const tail =
    (id || "")
      .toString()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6) || "x";
  return `${base}-${tail}`; // e.g. "personal-vault-a1b2c3"
}

function getActiveCustomerId(sp: URLSearchParams): string | null {
  const q = sp.get("customerId");
  if (q) return q;
  try {
    return (
      sessionStorage.getItem("lw_active_customer_id") ||
      sessionStorage.getItem("lw_onboarding_customer_id") ||
      null
    );
  } catch {
    return null;
  }
}

function extractVaultArray(payload: any): APIVault[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.records)) return d.records;
  if (Array.isArray(d?.vaults)) return d.vaults;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

function pickId(v: APIVault, idx: number, customerId: string) {
  return v.id || v.vaultId || v._id || `${customerId}:vault:${idx}`;
}

/** Prefer cookie → localStorage for auth */
function getAuthToken(): string {
  try {
    const m = document.cookie.match(
      /(?:^|;\s*)(authToken|lw_token|token)\s*=\s*([^;]+)/
    );
    if (m?.[2]) return decodeURIComponent(m[2]);
  } catch {}
  try {
    return (
      localStorage.getItem("lw_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

/* ============================ Inner (uses useSearchParams) ============================ */

function VaultDetailsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [tab, setTab] = useState<"ONGOING" | "COMPLETED">("ONGOING");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<VaultRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // route transition (for subtle global feedback)
  const [isRouting, startTransition] = useTransition();

  // read token once; don't cause refetch loops
  const token = useMemo(() => getAuthToken(), []);

  // persist scoped customerId if present
  useEffect(() => {
    const cid = sp.get("customerId");
    if (cid) {
      try {
        sessionStorage.setItem("lw_active_customer_id", cid);
        sessionStorage.removeItem("lw_onboarding_customer_id");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setRows([]);
      setLoading(false);
      setError("Missing customerId (query or session).");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // list by status (ONGOING/COMPLETED)
        const listRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults?status=${tab}`,
          {
            headers: token ? { "x-lw-auth": token } : undefined,
            cache: "no-store",
          }
        );
        if (!listRes.ok) throw new Error(`Vaults HTTP ${listRes.status}`);
        const listJ = await listRes.json().catch(() => ({}));
        const base = extractVaultArray(listJ);

        // enrich with detail to get reliable current & target
        const enriched = await Promise.all(
          base.map(async (v, i): Promise<VaultRow> => {
            const id = pickId(v, i, customerId);
            let detail: any = {};
            try {
              const r = await fetch(
                `/api/v1/agent/customers/${customerId}/vaults/${id}`,
                {
                  headers: token ? { "x-lw-auth": token } : undefined,
                  cache: "no-store",
                }
              );
              if (r.ok) {
                const j = await r.json().catch(() => ({}));
                detail = j?.data ?? j ?? {};
              }
            } catch {}

            const current =
              Number(
                v.currentAmount ?? detail.currentAmount ?? detail.currentBalance
              ) || 0;

            return {
              id, // REAL id
              name: v.name || detail?.name || "Personal Vault",
              daily: Number(v.amount ?? detail?.amount ?? 0) || 0,
              current,
              target: Number(v.targetAmount ?? detail?.targetAmount ?? 0) || 0,
            };
          })
        );

        if (!cancelled) setRows(enriched);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load vaults.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, token]);

  const pushVaultDetail = (v: VaultRow) => {
    const customerId = getActiveCustomerId(sp);
    const q = new URLSearchParams();
    if (customerId) q.set("customerId", customerId);
    q.set("vaultId", v.id); // REAL api id
    const slug = makeSafeSlug(v.name, v.id);
    startTransition(() =>
      router.push(`/customer/vault/${encodeURIComponent(slug)}?${q.toString()}`)
    );
  };

  return (
    <div
      className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4"
      aria-busy={isRouting}
    >
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={() => startTransition(() => router.back())}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-60"
            disabled={isRouting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <HelpCircle
            className="h-4 w-4 text-gray-400"
            aria-label="Help"
            role="img"
          />
        </div>

        {/* Title */}
        <div className="px-4">
          <h1 className="text-xl font-extrabold text-gray-900">
            All Personal Vaults
          </h1>
        </div>

        {/* Segmented control */}
        <div className="px-4 mt-3">
          <div className="grid grid-cols-2 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab("ONGOING")}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                tab === "ONGOING"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
              aria-pressed={tab === "ONGOING"}
            >
              Ongoing
            </button>
            <button
              onClick={() => setTab("COMPLETED")}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                tab === "COMPLETED"
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
              aria-pressed={tab === "COMPLETED"}
            >
              Completed
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-4 space-y-4">
          {error && (
            <p className="text-xs text-rose-600 border border-rose-100 rounded-md px-2 py-2">
              {error}
            </p>
          )}

          {loading ? (
            <>
              <div
                role="status"
                aria-live="polite"
                className="mb-3 inline-flex items-center gap-2 text-xs text-gray-700"
              >
                <LogoSpinner className="w-4 h-4" />
                Loading…
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl border border-gray-200 bg-gray-50 animate-pulse"
                />
              ))}
            </>
          ) : rows.length === 0 ? (
            /* ----- EMPTY STATE IMAGE (centered) ----- */
            <div className="flex items-center justify-center py-30">
              <Image
                src="/uploads/Empty State.png"
                alt="No vaults yet"
                width={240}
                height={240}
                className="w-30 h-30 object-contain"
                priority
              />
            </div>
          ) : (
            rows.map((v) => {
              const pct =
                v.target > 0
                  ? Math.min(100, Math.round((v.current / v.target) * 100))
                  : 0;
              return (
                <button
                  key={v.id}
                  onClick={() => pushVaultDetail(v)}
                  aria-label={`Open ${v.name}`}
                  className="w-full text-left rounded-2xl border border-gray-200 bg-white p-3 flex gap-3 hover:bg-gray-50 transition disabled:opacity-60"
                  disabled={isRouting}
                >
                  {/* icon */}
                  <div className="shrink-0 flex items-center justify-center h-[58px] w/[58px] rounded-xl bg-gray-50 border border-gray-200">
                    <Image
                      src="/uploads/Little wheel personal vault bw 1.png"
                      alt="Vault"
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain"
                      priority
                    />
                  </div>

                  {/* content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] font-semibold text-gray-900">
                        {v.name}
                      </p>
                      <p className="text-[12px] font-semibold">
                        <span className="text-red-600">{NGN2(v.current)}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-green-600">{NGN2(v.target)}</span>
                      </p>
                    </div>

                    <p className="text-[12px] text-gray-600 mt-1">
                      Amount:{" "}
                      <span className="font-semibold">{NGN2(v.daily)}</span>
                    </p>

                    {/* tiny green dot + progress + % */}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" />
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-gray-600">{pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Wrapper with Suspense ============================ */

export default function VaultDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VaultDetailsPageInner />
    </Suspense>
  );
}
