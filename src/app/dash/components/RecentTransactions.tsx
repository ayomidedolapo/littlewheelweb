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
  status?: string; // ✅ NEW (PENDING/PROCESSED/FAILED/etc)
};

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
});

const ICONS: Record<Txn["icon"], React.ReactNode> = {
  withdraw: <Wallet className="w-4 h-4 text-red-600" />,
  commission: <Banknote className="w-4 h-4 text-yellow-600" />,
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* ------------------------------ Status helpers --------------------------- */
function normalizeStatus(s: any): string {
  if (!s) return "";
  const raw = String(s).trim();
  if (!raw) return "";
  // make it "pending", "processed", "failed", etc
  return raw.toLowerCase().replace(/_/g, " ");
}

function statusClass(s: string) {
  const v = (s || "").toLowerCase();
  if (!v) return "text-slate-500";
  if (v.includes("pending") || v.includes("processing")) return "text-amber-600";
  if (v.includes("success") || v.includes("processed") || v.includes("completed"))
    return "text-emerald-600";
  if (v.includes("fail") || v.includes("rejected") || v.includes("declined"))
    return "text-rose-600";
  return "text-slate-500";
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

  const flow = (p.type || p.direction || p.flow || "").toString().toUpperCase();
  const isOut = flow.includes("OUT") || flow === "OUTFLOW" || flow === "DEBIT";
  const signedAmount = isOut ? -Math.abs(amountRaw) : Math.abs(amountRaw);

  const label =
    (p.description || p.title || p.note || p.narration || "")
      .toString()
      .trim() || (isOut ? "withdrawal" : "recharge");

  const iconHint = (p.icon || p.category || p.tag || "")
    .toString()
    .toLowerCase();

  let icon: Txn["icon"] = "recharge";
  if (
    iconHint.includes("commission") ||
    label.toLowerCase().includes("commission")
  ) {
    icon = "commission";
  } else if (isOut || iconHint.includes("withdraw")) {
    icon = "withdraw";
  } else {
    icon = "recharge";
  }

  // ✅ NEW: status from payload
  const status = normalizeStatus(
    p.status ?? p.transactionStatus ?? p.paymentStatus ?? p.state
  );

  return {
    id: String(id),
    createdAt: String(createdAt),
    amount: signedAmount,
    type: label.toLowerCase(),
    icon,
    status, // ✅
  };
}

/* --------------------------------- UI ------------------------------------ */
export default function RecentTransactions({
  items = MOCK_TXNS,
  onSeeAll,
  page = 1,
  limit = 7,
}: {
  items?: Txn[];
  onSeeAll?: () => void;
  page?: number;
  limit?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState<Txn[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const tokenHeader =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") ||
        localStorage.getItem("lw_token") ||
        ""
      : "";

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
          headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
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
  }, [shouldFetch, page, limit, tokenHeader]);

  const data = useMemo(() => {
    const src = shouldFetch ? fetched : items;
    return (src || []).slice(0, 5);
  }, [shouldFetch, fetched, items]);

  const handleSeeAll = () => {
    if (!onSeeAll) return;
    startTransition(() => onSeeAll());
  };

  return (
    <>
      <LogoSpinner show={isPending} invert blurStrength={3} />

      <section className="w-full" aria-busy={isPending}>
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

        {!loading && !error && data.length > 0 ? (
          <ul className="mt-3 divide-y divide-gray-100">
            {data.map((t) => {
              const isCredit = t.amount > 0;
              const sign = isCredit ? "+" : "-";
              const amountAbs = Math.abs(t.amount);

              const title = t.type
                ? t.type.charAt(0).toUpperCase() + t.type.slice(1)
                : "Transaction";

              const statusText = normalizeStatus(t.status);
              const statusTextPretty = statusText; // already "pending", "processed"...

              return (
                <li key={t.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 ${
                          ICON_BG[t.icon] || "bg-gray-100"
                        } rounded-full flex items-center justify-center shrink-0`}
                        aria-hidden
                      >
                        {ICONS[t.icon] || ICONS.recharge}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-gray-900 truncate">
                          {title}
                        </p>
                        <p className="text-[12px] text-slate-600 mt-1">
                          {fmtDate(t.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* ✅ Amount + Status (status sits right under amount like your screenshot) */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div
                        className={`text-[14px] font-semibold ${
                          isCredit ? "text-emerald-600" : "text-red-500"
                        }`}
                      >
                        {`${sign}${NGN.format(amountAbs)}`}
                      </div>

                      {!!statusTextPretty && (
                        <div
                          className={`text-[12px] font-medium leading-none ${statusClass(
                            statusTextPretty
                          )}`}
                        >
                          {statusTextPretty}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!loading && !error && data.length === 0 && (
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
