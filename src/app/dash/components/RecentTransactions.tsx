"use client";

import { Wallet, Banknote, ArrowDownFromLine } from "lucide-react";

type Txn = {
  id: string;
  title: string;
  timestamp: string; // e.g., "Mar 4th, 02:46:32"
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
  commission: <Banknote className="w-4 h-4 text-yellow-500" />, // yellow now
  recharge: <ArrowDownFromLine className="w-4 h-4 text-emerald-600" />,
};

const ICON_BG: Record<Txn["icon"], string> = {
  withdraw: "bg-red-50",
  commission: "bg-yellow-50",
  recharge: "bg-emerald-50",
};

// Mock data set to empty until API comes in
const MOCK_TXNS: Txn[] = [];

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
                        {t.title}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {t.timestamp}
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
        <div className="mt-4 text-center text-[13px] text-slate-500">
          No recent transaction done
        </div>
      )}
    </section>
  );
}
