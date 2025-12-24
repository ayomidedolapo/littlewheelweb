/* app/customer/vault/[slug]/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------------- skeleton helper ---------------- */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
  );
}

/* ---------------- helpers ---------------- */
const NGN = (v?: number) =>
  `₦${Number(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const clampPct = (v?: number) =>
  isFinite(v as number)
    ? Math.max(0, Math.min(100, Math.round(v as number)))
    : 0;

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  return `${ordinal(dt.getDate())} ${dt.toLocaleString(undefined, {
    month: "short",
  })}, ${dt.getFullYear()}`;
}
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/* normalize any list payload into an array */
function extractArray(payload: any): any[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.records)) return d.records;
  if (Array.isArray(d?.vaults)) return d.vaults;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

/** Try cookie first (browser), then localStorage */
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

/* numbers + date helpers */
const nnum = (v: any, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
const addDays = (d: Date, days: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const addWeeks = (d: Date, weeks: number) => addDays(d, weeks * 7);
const addMonths = (d: Date, months: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
};

/* ---------- types ---------- */
type VaultDetail = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: number | string;
  amount?: number | string; // plan amount (daily/weekly/monthly)
  frequency?: string; // DAILY / WEEKLY / MONTHLY / ...
  duration?: string; // ONE_MONTH / etc
  startDate?: string;
  start_at?: string;
  createdAt?: string;
  maturityDate?: string;
  endDate?: string;

  currentAmount?: number | string;
  currentBalance?: number | string;
  balance?: number | string;

  isCompleted?: boolean;
};

type Tx = {
  id: string;
  note: string;
  amount: number;
  at: string;
  isCredit: boolean;
  vaultId?: string;
};

/* compute a theoretical maturity date if backend didn't provide one */
function computeMaturity(detail?: VaultDetail): Date | null {
  if (!detail) return null;
  const freq = String(detail.frequency || "DAILY").toUpperCase();
  const target = nnum(detail.targetAmount);
  const per = nnum(detail.amount);
  const startIso =
    detail.startDate || (detail as any)?.start_at || detail.createdAt;
  if (!startIso || !target || !per) return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const steps = Math.max(1, Math.ceil(target / per));
  // end occurs on the day of last contribution => steps - 1 offset
  if (freq === "DAILY") return addDays(start, steps - 1);
  if (freq === "WEEKLY") return addWeeks(start, steps - 1);
  if (freq === "MONTHLY") return addMonths(start, steps - 1);
  // default to DAILY math if unknown
  return addDays(start, steps - 1);
}

export default function VaultDetailPage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();
  const params = useParams<{ slug: string }>();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<VaultDetail | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);

  // close modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeErr, setCloseErr] = useState<string | null>(null);

  // stable token ref
  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }

  const customerId =
    sp.get("customerId") ||
    (typeof window !== "undefined"
      ? sessionStorage.getItem("lw_active_customer_id") ||
        sessionStorage.getItem("lw_onboarding_customer_id") ||
        ""
      : "");

  // The "authoritative" vault id comes from query; we may also derive from loaded detail.
  const queryVaultId = sp.get("vaultId") || "";
  const resolvedVaultId =
    queryVaultId || detail?.id || detail?.vaultId || detail?._id || "";

  const authHeaders = tokenRef.current
    ? { "x-lw-auth": tokenRef.current }
    : undefined;

  /* ---------------- load vault detail ---------------- */
  useEffect(() => {
    if (!customerId) {
      setError("Missing customerId.");
      setLoading(false);
      return;
    }
    const idFromQuery = sp.get("vaultId");
    if (!idFromQuery) {
      setError("Missing vaultId.");
      setLoading(false);
      return;
    }

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults/${idFromQuery}`,
          {
            cache: "no-store",
            signal: ac.signal,
            headers: authHeaders,
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`Vault HTTP ${res.status}`);

        const j = await res.json().catch(() => ({}));
        const raw: VaultDetail = j?.data ?? j ?? {};

        // Normalize numerics that might be strings
        const normalized: VaultDetail = {
          ...raw,
          targetAmount: nnum(raw.targetAmount),
          amount: nnum(raw.amount),
          currentAmount: nnum(
            raw.currentAmount ?? raw.currentBalance ?? (raw as any)?.balance
          ),
          currentBalance: nnum(
            raw.currentBalance ?? raw.currentAmount ?? (raw as any)?.balance
          ),
          balance: nnum(
            (raw as any)?.balance ?? raw.currentBalance ?? raw.currentAmount
          ),
        };

        setDetail(normalized);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load vault detail.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, sp]);

  /* ---------------- load contributions (customer-wide endpoint, then filter) ---------------- */
  useEffect(() => {
    if (!customerId) return;

    const ac = new AbortController();

    (async () => {
      try {
        setTxLoading(true);

        // Try a vault-specific contributions endpoint first (if available)
        let rows: any[] = [];
        let ok = false;
        if (resolvedVaultId) {
          const r1 = await fetch(
            `/api/v1/agent/customers/${customerId}/vaults/${resolvedVaultId}/contributions`,
            {
              cache: "no-store",
              signal: ac.signal,
              headers: authHeaders,
              credentials: "include",
            }
          );
          if (r1.ok) {
            const j1 = await r1.json().catch(() => ({}));
            rows = extractArray(j1);
            ok = true;
          }
        }

        // fallback to all contributions and filter client-side
        if (!ok) {
          const res = await fetch(
            `/api/v1/agent/customers/${customerId}/vaults/contributions`,
            {
              headers: authHeaders,
              cache: "no-store",
              signal: ac.signal,
              credentials: "include",
            }
          );

          if (!res.ok) throw new Error(`Contributions HTTP ${res.status}`);

          const j = await res.json().catch(() => ({}));
          const all = extractArray(j);
          rows = resolvedVaultId
            ? all.filter((r: any) => {
                const vid = r?.vaultId || r?.vault_id || r?.vault?.id;
                return (
                  String(vid || "").toLowerCase() ===
                  String(resolvedVaultId).toLowerCase()
                );
              })
            : all;
        }

        let mapped: Tx[] = (rows || []).map((r: any, idx: number) => {
          const rid =
            r.id ||
            r._id ||
            r.txId ||
            r.reference ||
            `contrib:${idx}:${r.createdAt || r.date || ""}`;

          const amount = nnum(r.amount ?? r.value ?? r.contribution, 0);
          const created =
            r.createdAt || r.date || r.at || new Date().toISOString();
          const type = String(
            r.type || r.direction || r.kind || "CREDIT"
          ).toUpperCase();
          const isCredit =
            type.includes("CREDIT") ||
            type.includes("DEPOSIT") ||
            type.includes("TOPUP");
          const note =
            r.note || r.description || (isCredit ? "Deposit" : "Withdrawal");
          const vId = r.vaultId || r.vault_id || r.vault?.id;

          return {
            id: rid,
            note,
            amount: Math.abs(amount),
            at: new Date(created).toISOString(),
            isCredit,
            vaultId: vId,
          };
        });

        mapped.sort(
          (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
        );

        setTxs(mapped);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTxs([]);
      } finally {
        setTxLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, resolvedVaultId]);

  /* ---------------- derived fields ---------------- */
  const name = detail?.name || "Personal Savings";
  const target = nnum(detail?.targetAmount);
  const planAmount = nnum(detail?.amount);
  const liveBalance = nnum(
    detail?.currentAmount ?? detail?.currentBalance ?? (detail as any)?.balance
  );
  const progress = useMemo(
    () => clampPct(target ? (liveBalance / target) * 100 : 0),
    [liveBalance, target]
  );

  const duration = (detail?.duration || "—").toString().replace(/_/g, " ");
  const frequency = (detail?.frequency || "DAILY")
    .toString()
    .replace(/_/g, " ");
  const startedAt =
    detail?.startDate || (detail as any)?.start_at || detail?.createdAt;

  // Prefer backend maturity; otherwise compute theoretical maturity based on plan
  const maturityRaw = detail?.maturityDate || detail?.endDate || null;
  const maturityComputed = computeMaturity(detail);
  const maturity = maturityRaw || maturityComputed;

  const isCompleted =
    Boolean(detail?.isCompleted) || (target > 0 && liveBalance >= target);

  /* ---------------- close vault action ---------------- */
  const doCloseVault = async () => {
    if (!customerId || !resolvedVaultId) return;
    try {
      setClosing(true);
      setCloseErr(null);
      const res = await fetch(
        `/api/v1/agent/customers/${customerId}/vaults/${resolvedVaultId}/close`,
        {
          method: "DELETE",
          headers: authHeaders,
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error(`Close HTTP ${res.status}`);

      setConfirmOpen(false);
      startTransition(() =>
        router.replace(
          `/customer/vault?customerId=${encodeURIComponent(customerId)}`
        )
      );
    } catch (e: any) {
      setCloseErr(e?.message || "Failed to close vault.");
    } finally {
      setClosing(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* ✅ Global route spinner (same pattern everywhere) */}
      <LogoSpinner show={isRouting} />

      <div className="min-h-screen bg-[#F4F6FA] flex items-start justify-center">
        {/* wider container so content isn't compressed */}
        <div className="w-full max-w-[480px] min-h-screen bg-[#F4F6FA] md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Top bar */}
          <div className="px-4 pt-4 pb-2 bg-[#F4F6FA]">
           <button
  onClick={() =>
    startTransition(() => {
      const q = customerId
        ? `?customerId=${encodeURIComponent(customerId)}`
        : "";
      router.push(`/customer/vault${q}`);
    })
  }
  className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
>
  <ArrowLeft className="h-4 w-4" />
</button>

          </div>

          {/* Page title */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <h1 className="text-[15px] font-semibold text-gray-900">{name}</h1>
            {txLoading && !loading && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                <LogoSpinner show={true} />
                syncing…
              </span>
            )}
          </div>

          {loading ? (
            /* ---------- Skeleton loading state ---------- */
            <div className="px-4 pb-6 space-y-3">
              {/* Top vault card skeleton */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                  <div className="shrink-0 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                </div>
              </div>

              {/* Stats card skeleton */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>

              {/* Transactions card skeleton */}
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-2 w-20" />
                      </div>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Close button skeleton */}
              <div className="py-2">
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              {/* ---------- Top vault card ---------- */}
              <div className="px-4">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3">
                  <div className="flex items-start gap-3">
                    {/* vault icon */}
                    <div className="shrink-0">
                      <Image
                        src="/uploads/Little wheel personal vault bw 1.png"
                        alt="Vault"
                        width={48}
                        height={48}
                        className="w-12 h-12 object-contain"
                        priority
                      />
                    </div>

                    {/* middle */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 leading-tight truncate">
                        {new Date(startedAt || new Date()).toLocaleString(
                          undefined,
                          { month: "long" }
                        )}{" "}
                        {new Date(startedAt || new Date()).getDate()}
                      </p>
                      <p className="text-[11px] text-gray-600">
                        Amount: <strong>{NGN(planAmount)}</strong> (
                        {frequency || "—"})
                      </p>

                      {/* progress bar */}
                      <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: "#10B981",
                          }}
                        />
                      </div>
                    </div>

                    {/* right totals — single straight line */}
                    <div className="shrink-0 text-right leading-tight text-[12px]">
                      <p className="whitespace-nowrap font-bold">
                        <span className="text-rose-600">
                          {NGN(liveBalance)}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-emerald-600">{NGN(target)}</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {progress}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ---------- Stats card ---------- */}
              <div className="px-4 mt-3">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Target Amount
                      </p>
                      <p className="text-[14px] font-bold text-gray-900 mt-1">
                        {NGN(target)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Amount
                      </p>
                      <p className="text-[14px] font-bold text-gray-900 mt-1">
                        {NGN(planAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Duration
                      </p>
                      <p className="text-[12px] font-bold text-gray-900 mt-1">
                        {duration || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Frequency
                      </p>
                      <p className="text-[12px] font-bold text-gray-900 mt-1">
                        {frequency || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Start Date
                      </p>
                      <p className="text-[12px] font-bold text-gray-900 mt-1">
                        {fmtDate(startedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">
                        Maturity Date
                      </p>
                      <p className="text-[12px] font-bold text-gray-900 mt-1">
                        {fmtDate(maturity)}
                      </p>
                    </div>
                  </div>

                  {/* Optional status badge */}
                  <div className="mt-3 text-[12px]">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 ${
                        isCompleted
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {isCompleted ? "Completed" : "Active"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ---------- Transactions card ---------- */}
              <div className="px-4 mt-3">
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
                  <p className="text-[13px] font-semibold text-gray-900 mb-2">
                    Transactions
                  </p>

                  {txLoading ? (
                    <div className="divide-y divide-gray-100">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="space-y-1">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-2 w-20" />
                          </div>
                          <Skeleton className="h-3 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : txs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Image
                        src="/uploads/Empty State.png"
                        alt="No transactions"
                        width={160}
                        height={160}
                        className="w-40 h-40 object-contain"
                        priority
                      />
                      <p className="text-[12px] text-gray-500 mt-2">
                        No transactions yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {txs.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div>
                            <p className="text-[13px] font-medium text-gray-900">
                              {t.note}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {fmtDateTime(t.at)}
                            </p>
                          </div>
                          <div
                            className={`text-[13px] font-semibold ${
                              t.isCredit ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {t.isCredit ? "+" : "−"}
                            {NGN(t.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ---------- Close Vault button ---------- */}
              <div className="px-4 py-5">
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="w-full h-12 rounded-2xl bg-rose-100 text-rose-700 font-semibold active:scale-[0.99] transition"
                >
                  Close Vault
                </button>
              </div>
            </>
          )}
        </div>

        {/* ===== Close Vault Confirmation (bottom sheet) ===== */}
        {confirmOpen && (
          <div className="fixed inset-0 z-50">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => !closing && setConfirmOpen(false)}
            />
            {/* sheet */}
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Are you sure you want to close this vault?
                </h3>
                <button
                  onClick={() => !closing && setConfirmOpen(false)}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-[12px] text-gray-600 mb-4">
                Note: This action cannot be undone.
              </p>

              {closeErr && (
                <p className="text-[12px] text-rose-600 mb-3">{closeErr}</p>
              )}

              <button
                onClick={doCloseVault}
                disabled={closing}
                className={`w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                  closing
                    ? "bg-rose-500/80 text-white"
                    : "bg-rose-600 text-white"
                } disabled:opacity-70`}
              >
                {closing ? (
                  <>
                    <LogoSpinner show={true} /> Closing…
                  </>
                ) : (
                  "Close Vault"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
