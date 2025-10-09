/* app/dash/components/transactions/page.tsx */
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Wallet,
  Banknote,
  ArrowDownFromLine,
} from "lucide-react";

/* ✅ Centered logo spinner overlay */
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* --------------------------- Types --------------------------- */
type Txn = {
  id: string;
  type: "withdrawal" | "commission" | "recharge" | string;
  createdAt: string; // ISO
  amount: number; // negative = debit, positive = credit
  icon: "withdraw" | "commission" | "recharge";
};

/* ----------------------- Formatters/helpers ------------------ */
const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

const ICONS: Record<Txn["icon"], React.ReactNode> = {
  withdraw: <Wallet className="w-4 h-4 text-red-600" />,
  commission: <Banknote className="w-4 h-4 text-yellow-500" />,
  recharge: <ArrowDownFromLine className="w-4 h-4 text-emerald-600" />,
};

const ICON_BG: Record<Txn["icon"], string> = {
  withdraw: "bg-red-50",
  commission: "bg-yellow-50",
  recharge: "bg-emerald-50",
};

function fmtDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const day = d.getDate();
    const ord =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    const month = d.toLocaleString(undefined, { month: "short" });
    const time = d.toLocaleString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${day}${ord} ${month}, ${time}`;
  } catch {
    return iso;
  }
}

function fmtGroupDate(iso: string) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

/* ------------------------------ Mappers ------------------------------ */
function pickArray(payload: any): any[] {
  if (!payload) return [];

  const deepCands = [
    payload?.data?.data?.items,
    payload?.data?.list?.items,
    payload?.data?.items,
    payload?.list?.items,
  ];
  for (const c of deepCands) if (Array.isArray(c)) return c;

  const top = [payload.data, payload.results, payload.items, payload.docs];
  for (const c of top) if (Array.isArray(c)) return c;

  if (Array.isArray(payload)) return payload;

  return [];
}

function toTxn(p: any): Txn | null {
  if (!p) return null;

  const id =
    p.id ||
    p._id ||
    p.reference ||
    p.ref ||
    p.txnId ||
    p.txId ||
    Math.random().toString(36).slice(2);

  const createdAt =
    p.createdAt ||
    p.created_at ||
    p.date ||
    p.timestamp ||
    new Date().toISOString();

  const numeric = Number(p.amount ?? p.value ?? p.total ?? 0);
  const amountRaw = Number.isFinite(numeric) ? numeric : 0;

  const flow = (p.type || p.direction || "").toString().toUpperCase();
  const isOut = flow.includes("OUT") || flow === "OUTFLOW";
  const signedAmount = isOut ? -Math.abs(amountRaw) : Math.abs(amountRaw);

  const label =
    (p.description || p.title || p.note || "").toString().trim() ||
    (isOut ? "withdrawal" : "recharge");

  const iconHint = (p.icon || p.category || p.tag || "")
    .toString()
    .toLowerCase();
  let icon: Txn["icon"] = "recharge";
  if (
    iconHint.includes("commission") ||
    label.toLowerCase().includes("commission")
  )
    icon = "commission";
  else if (isOut || iconHint.includes("withdraw")) icon = "withdraw";
  else icon = "recharge";

  return {
    id: String(id),
    createdAt: String(createdAt),
    amount: signedAmount,
    type: label.toLowerCase(),
    icon,
  };
}

/* --------------------------- Filters/tabs --------------------------- */
type TabKey = "all" | "deposit" | "topup" | "earnings" | "withdrawal";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposit" },
  { key: "topup", label: "Credit Top-up" },
  { key: "earnings", label: "Earnings" },
  { key: "withdrawal", label: "Withdrawal" },
];

function matchTab(tab: TabKey, t: Txn) {
  switch (tab) {
    case "deposit":
      return t.amount > 0 && t.icon !== "commission";
    case "topup":
      return t.icon === "recharge";
    case "earnings":
      return t.icon === "commission";
    case "withdrawal":
      return t.amount < 0 || t.icon === "withdraw";
    default:
      return true;
  }
}

/* --------------------------- Page --------------------------- */
export default function FullTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("tab") as TabKey) || "all";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Txn[]>([]);

  const mountedRef = useRef(false);

  // fetch page
  useEffect(() => {
    let cancelled = false;

    async function load(p = 1) {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams({
          page: String(p),
          limit: "20",
          sort: "-createdAt",
        }).toString();

        const res = await fetch(`/api/v1/payments?${qs}`, {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const text = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(text || "{}");
        } catch {}

        if (!res.ok)
          throw new Error(json?.message || json?.error || `HTTP ${res.status}`);

        const arr = pickArray(json);
        const txns = (arr.map(toTxn).filter(Boolean) as Txn[]).sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
        );

        if (!cancelled) {
          if (p === 1) {
            setData(txns);
          } else {
            setData((prev) => [...prev, ...txns]);
          }
          setHasMore(txns.length >= 20);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load transactions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load(page);

    return () => {
      cancelled = true;
    };
  }, [page]);

  // when tab/search changes, reset to page 1 (client-side filter)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setPage(1);
  }, [tab, query]);

  // filtered view
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((t) => {
      if (!matchTab(tab, t)) return false;
      if (!q) return true;
      const hay = `${t.id} ${t.type} ${fmtDateTime(t.createdAt)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, tab, query]);

  // group by calendar date
  const groups = useMemo(() => {
    const map = new Map<string, Txn[]>();
    for (const t of filtered) {
      const key = fmtGroupDate(t.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort(
      (a, b) =>
        +new Date(b[1][0]?.createdAt || 0) - +new Date(a[1][0]?.createdAt || 0)
    );
  }, [filtered]);

  return (
    <div className="min-h-screen bg-white">
      {/* ✅ Centered logo spinner overlay while fetching */}
      <LogoSpinner show={loading} invert blurStrength={2} />

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={() => router.back()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-[18px] font-extrabold text-gray-900">
            Transaction History
          </h1>
        </div>

        {/* Tabs */}
        <div className="px-3 pb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 h-8 rounded-xl text-[12px] font-semibold border ${
                tab === t.key
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-900 border-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="h-11 rounded-2xl border border-gray-200 px-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 h-full outline-none text-[13px]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-6">
        {/* States */}
        {loading && data.length === 0 && (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-100 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[12px] text-rose-700">
            {error}
          </div>
        )}

        {/* Groups */}
        {!loading && !error && groups.length === 0 && (
          <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-8 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/Empty State.png"
              alt="No transactions"
              className="h-28 object-contain opacity-90"
            />
          </div>
        )}

        {!error &&
          groups.map(([dateLabel, items]) => (
            <section key={dateLabel} className="mb-4">
              <h3 className="text-[12px] font-semibold text-gray-700 mb-2">
                {dateLabel}
              </h3>

              <div className="rounded-2xl border border-gray-100 bg-white divide-y divide-gray-100">
                {items.map((t) => {
                  const isCredit = t.amount > 0;
                  const sign = isCredit ? "" : "-";
                  const amountAbs = Math.abs(t.amount);

                  return (
                    <div
                      key={t.id}
                      className="px-3 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 ${
                            ICON_BG[t.icon] || "bg-gray-100"
                          } rounded-full flex items-center justify-center`}
                        >
                          {ICONS[t.icon] || ICONS.recharge}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate">
                            {t.type
                              ? t.type.charAt(0).toUpperCase() + t.type.slice(1)
                              : "Transaction"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {fmtDateTime(t.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`text-[13px] font-semibold ${
                          isCredit ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {`${sign}${NGN.format(amountAbs)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

        {/* Load more */}
        {hasMore && !loading && !error && data.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full h-11 rounded-xl bg-black text-white font-semibold active:scale-[0.99]"
            >
              Load more
            </button>
          </div>
        )}

        {loading && data.length > 0 && (
          <div className="mt-3 text-center text-[12px] text-gray-600">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
