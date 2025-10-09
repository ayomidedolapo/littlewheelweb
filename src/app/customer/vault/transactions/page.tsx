/* app/customer/vault/transactions/page.tsx */
"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------------- helpers & types ---------------- */

type TxAPI = any;

type Tx = {
  id: string;
  at: string; // ISO
  label: "TOPUP" | "WITHDRAWAL";
  amount: number;
  isCredit: boolean;
  // optional extras for details page
  customerName?: string;
  agentName?: string;
  ref?: string;
  avatarUrl?: string | null;
  vaultId?: string | null;
};

type Filter = "ALL" | "DEPOSIT" | "WITHDRAW";

const fmtNGN = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateKey = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const dateTimePretty = (iso: string) => {
  const d = new Date(iso);
  const day = d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${day}, ${time}`;
};

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

function extractArray(payload: any): any[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.records)) return d.records;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  return [];
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

/* ===================== Inner component (uses useSearchParams) ===================== */

function VaultTransactionsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState(""); // search by date or amount
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [error, setError] = useState<string | null>(null);

  // global route spinner (keeps UX consistent with other pages)
  const [isRouting, startTransition] = useTransition();

  // stable token (read once)
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

  // fetch transactions from contributions API
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setLoading(false);
      setError("Missing customerId.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/v1/agent/customers/${customerId}/vaults/contributions`;
        const res = await fetch(url, {
          headers: token ? { "x-lw-auth": token } : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const j = await res.json().catch(() => ({}));
        const rows = extractArray(j);

        const mapped: Tx[] = (rows || []).map((r: TxAPI, i: number) => {
          const id =
            r.id ||
            r._id ||
            r.reference ||
            r.txId ||
            `tx:${i}:${r.createdAt || r.date || ""}`;
          const amount =
            Number(r.amount ?? r.value ?? r.contribution ?? 0) || 0;
          const t = String(
            r.type || r.direction || r.kind || "CREDIT"
          ).toUpperCase();
          const isCredit =
            t.includes("CREDIT") ||
            t.includes("DEPOSIT") ||
            t.includes("TOPUP");
          const label: Tx["label"] = isCredit ? "TOPUP" : "WITHDRAWAL";
          const at = new Date(
            r.createdAt || r.date || r.at || Date.now()
          ).toISOString();

          return {
            id,
            at,
            amount: Math.abs(amount),
            isCredit,
            label,
            customerName:
              r.customerName ||
              r.customer?.fullName ||
              r.customer?.name ||
              undefined,
            agentName: r.agentName || r.agent?.name || undefined,
            ref:
              r.reference ||
              r.transactionReference ||
              r.ref ||
              r.txRef ||
              r.txReference ||
              r.transactionId ||
              undefined,
            avatarUrl:
              r.customer?.avatarUrl || r.customer?.profileImageUrl || null,
            vaultId: r.vaultId || r.vault_id || r.vault?.id || null,
          };
        });

        mapped.sort((a, b) => +new Date(b.at) - +new Date(a.at));

        if (!cancelled) setTxs(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load transactions.");
          setTxs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // filtering + searching
  const filtered = useMemo(() => {
    let arr = txs;
    if (filter === "DEPOSIT") arr = arr.filter((t) => t.isCredit);
    if (filter === "WITHDRAW") arr = arr.filter((t) => !t.isCredit);

    const qs = q.trim().toLowerCase();
    if (!qs) return arr;

    return arr.filter((t) => {
      const amt = fmtNGN(t.amount).toLowerCase();
      const day = dateKey(t.at).toLowerCase();
      const lbl = t.label.toLowerCase();
      return amt.includes(qs) || day.includes(qs) || lbl.includes(qs);
    });
  }, [txs, filter, q]);

  // group by date headers
  const grouped = useMemo(() => {
    const m = new Map<string, Tx[]>();
    for (const t of filtered) {
      const k = dateKey(t.at);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(t);
    }
    return Array.from(m.entries()).sort(
      (a, b) =>
        new Date(b[0].split("/").reverse().join("-")).getTime() -
        new Date(a[0].split("/").reverse().join("-")).getTime()
    );
  }, [filtered]);

  const goBack = () => startTransition(() => router.back());

  // navigate to transaction details (pass through enough to render immediately)
  const openDetails = (t: Tx) => {
    const customerId = getActiveCustomerId(sp) || "";
    const qs = new URLSearchParams();
    if (customerId) qs.set("customerId", customerId);
    qs.set("txId", t.id);
    qs.set("type", t.isCredit ? "CREDIT" : "DEBIT");
    qs.set("amount", String(t.amount));
    qs.set("at", t.at);
    if (t.ref) qs.set("ref", t.ref);
    if (t.vaultId) qs.set("vaultId", String(t.vaultId));

    startTransition(() =>
      router.push(`/customer/vault/transaction-details?${qs.toString()}`)
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <div
      className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4"
      aria-busy={isRouting}
    >
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center gap-2">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-60"
            disabled={isRouting}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {isRouting && (
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
              <LogoSpinner className="w-3.5 h-3.5" />
              loading…
            </span>
          )}
        </div>

        {/* Title + Filters */}
        <div className="px-4 pt-2 pb-3">
          <h1 className="text-xl font-extrabold text-gray-900">
            Transaction History
          </h1>

          {/* Tabs */}
          <div className="mt-3 grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-xl">
            {(
              [
                ["ALL", "All"],
                ["DEPOSIT", "Deposit"],
                ["WITHDRAW", "Withdraw"],
              ] as Array<[Filter, string]>
            ).map(([k, label]) => {
              const isActive = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`h-9 rounded-lg text-sm font-semibold ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-transparent text-gray-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-900 w-4 h-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by date or amount"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* List */}
        <div className="px-4 pb-6">
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
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl bg-gray-50 animate-pulse"
                  />
                ))}
              </div>
            </>
          ) : error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : grouped.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Image
                src="/uploads/Empty State.png"
                alt="No transactions"
                width={220}
                height={220}
                className="opacity-90 w-30 h-30"
                priority
              />
              <p className="mt-3 text-sm text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([day, rows]) => (
                <div key={day} className="rounded-2xl border border-gray-100">
                  <div className="px-4 py-3 text-[13px] font-bold text-gray-900">
                    {day}
                  </div>

                  <div className="divide-y divide-gray-100">
                    {rows.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openDetails(t)}
                        className="w-full text-left bg-white px-4 py-3 active:bg-gray-50 disabled:opacity-60"
                        aria-label={`Open ${t.label} of ${fmtNGN(
                          t.amount
                        )} on ${dateTimePretty(t.at)}`}
                        disabled={isRouting}
                      >
                        <div className="flex items-center gap-3">
                          {/* left icon circle (green like screenshot) */}
                          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                            <Check className="w-5 h-5 text-emerald-600" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-900">
                              {t.label}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {dateTimePretty(t.at)}
                            </p>
                          </div>

                          <div
                            className={`text-[13px] font-semibold whitespace-nowrap ${
                              t.isCredit ? "text-black" : "text-rose-600"
                            }`}
                          >
                            {t.isCredit ? "" : "-"}
                            {fmtNGN(t.amount)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== Wrapper with Suspense (fixes the build error) ===================== */

export default function VaultTransactionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <VaultTransactionsPageInner />
    </Suspense>
  );
}
