// app/dash/components/RecentTransactions.tsx
"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { Wallet, Banknote, ArrowDownFromLine } from "lucide-react";

/* ✅ Logo spinner overlay (centered, inverted, light blur) */
import LogoSpinner from "../../../components/loaders/LogoSpinner";

type Txn = {
  id: string;
  type: "withdrawal" | "commission" | "recharge" | string;
  createdAt: string; // ISO
  amount: number; // negative = debit, positive = credit
  icon: "withdraw" | "commission" | "recharge";
};

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

const MOCK_TXNS: Txn[] = [];

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------ Mappers ---------------------------------- */
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

/* --------------------------------- UI ------------------------------------ */
export default function RecentTransactions({
  items = MOCK_TXNS,
  onSeeAll,
  page = 1,
  limit = 5, // ← fetch only 5 by default
}: {
  items?: Txn[];
  onSeeAll?: () => void;
  page?: number;
  limit?: number; // how many to fetch when this component fetches for itself
}) {
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<Txn[]>([]);
  const [error, setError] = useState<string | null>(null);

  // show spinner overlay only while navigating to "See all"
  const [isPending, startTransition] = useTransition();

  // If parent didn't pass items, we'll fetch from API
  const shouldFetch = !items || items.length === 0;

  useEffect(() => {
    let cancelled = false;
    if (!shouldFetch) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const qs = new URLSearchParams({
          page: String(page),
          limit: String(limit),
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
        const txns = arr.map(toTxn).filter(Boolean) as Txn[];

        if (!cancelled) setFetched(txns);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load transactions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, page, limit]);

  // Whether we fetched or were given items, only show the first 5
  const data = useMemo(() => {
    const src = shouldFetch ? fetched : items;
    return (src || []).slice(0, 5);
  }, [shouldFetch, fetched, items]);

  const hasTxns = !!data && data.length > 0;

  const handleSeeAll = () => {
    if (!onSeeAll) return;
    startTransition(() => {
      onSeeAll();
    });
  };

  return (
    <>
      {/* ✅ Centered logo spinner during route transition (See all) */}
      <LogoSpinner show={isPending} invert blurStrength={3} />

      <section className="w-full" aria-busy={isPending}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-gray-900">
            Recent Transactions
          </h2>

          <button
            onClick={handleSeeAll}
            className="text-[11px] text-gray-900 underline underline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isPending}
          >
            See all
          </button>
        </div>

        {/* States */}
        {loading && (
          <div className="mt-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
                  <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-[12px] text-rose-700">
            {error}
          </div>
        )}

        {/* List or Empty */}
        {!loading && !error && hasTxns ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.map((t) => {
              const isCredit = t.amount > 0;
              const sign = isCredit ? "+" : "-";
              const amountAbs = Math.abs(t.amount);

              return (
                <li key={t.id} className="py-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: Icon + text */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 ${
                          ICONS[t.icon] ? ICON_BG[t.icon] : "bg-gray-100"
                        } rounded-full flex items-center justify-center`}
                        aria-hidden
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
                          {fmtDate(t.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div
                      className={`text-[13px] font-semibold ${
                        isCredit ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {`${sign}${NGN.format(amountAbs)}`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!loading && !error && !hasTxns && (
          <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-6 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/Empty State.png"
              alt="No recent transactions"
              className="h-28 object-contain opacity-90"
            />
          </div>
        )}
      </section>
    </>
  );
}
