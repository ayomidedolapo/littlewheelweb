"use client";

import { Wallet, Banknote, ArrowDownFromLine } from "lucide-react";
import React from "react";

type Txn = {
  id: "txn_123";
  type: "withdrawal";
  createdAt: "2025-09-12T15:20:30Z";
  amount: -2000; // negative = debit, positive = credit
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

// Mock data set to empty until API comes in
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

export default function RecentTransactions({
  items = MOCK_TXNS,
  onSeeAll,
}: {
  items?: Txn[];
  onSeeAll?: () => void;
}) {
  const hasTxns = items && items.length > 0;

  return (
    <section className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-gray-900">
          Recent Transactions
        </h2>

        <button
          onClick={onSeeAll}
          className="text-[11px] text-gray-900 underline underline-offset-2"
        >
          See all
        </button>
      </div>

      {/* List or Empty */}
      {hasTxns ? (
        <ul className="mt-3 divide-y divide-gray-100">
          {items.map((t) => {
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
                        ICON_BG[t.icon]
                      } rounded-full flex items-center justify-center`}
                      aria-hidden
                    >
                      {ICONS[t.icon]}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">
                        {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
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
      ) : (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-6 flex items-center justify-center">
          {/* Empty state image */}
          {/* Make sure you have: public/upload/Empty State.png */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/uploads/Empty State.png"
            alt="No recent transactions"
            className="h-28 object-contain opacity-90"
          />
        </div>
      )}
    </section>
  );
}
