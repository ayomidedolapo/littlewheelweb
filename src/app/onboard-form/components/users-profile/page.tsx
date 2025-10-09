"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Phone,
  CircleDot,
} from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ----------------------------- tiny date utils ---------------------------- */
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const formatMonthYear = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

/** Build a 6x7 matrix including leading/trailing days from adjacent months (Mon-first). */
function getMonthMatrix(anchor: Date) {
  const first = startOfMonth(anchor);
  const last = endOfMonth(anchor);

  // Make Monday index 0
  const firstDayIdx = (first.getDay() + 6) % 7; // Sun=0 -> 6
  const daysInPrevMonth = endOfMonth(addMonths(anchor, -1)).getDate();
  const daysInThisMonth = last.getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];

  // Leading prev-month days
  for (let i = firstDayIdx - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    cells.push({
      date: new Date(anchor.getFullYear(), anchor.getMonth() - 1, d),
      inMonth: false,
    });
  }
  // Current month days
  for (let d = 1; d <= daysInThisMonth; d++) {
    cells.push({
      date: new Date(anchor.getFullYear(), anchor.getMonth(), d),
      inMonth: true,
    });
  }
  // Trailing next-month days
  while (cells.length % 7 !== 0) {
    const nextDay = cells.length - (firstDayIdx + daysInThisMonth) + 1;
    cells.push({
      date: new Date(anchor.getFullYear(), anchor.getMonth() + 1, nextDay),
      inMonth: false,
    });
  }
  // Ensure 6 rows (like your design)
  while (cells.length < 42) {
    const lastCell = cells[cells.length - 1].date;
    const d = new Date(lastCell);
    d.setDate(d.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }

  const rows: { date: Date; inMonth: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

/* ------------------------------- mock profile ----------------------------- */
const PROFILE = {
  name: "Aderibigbe Taiwo Sulaimon",
  totalSaved: 0,
  planLabel: "₦1,000 daily",
  withdrawalDate: "30th Dec., 2024",
  status: "Active",
  phone: "+234(0)8197265334",
};
const TX: Array<{
  id: string;
  date: string;
  type: "deposit" | "withdrawal";
  amount: number;
}> = []; // empty → shows image

export default function UsersProfilePage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const matrix = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const monthLabel = useMemo(
    () => formatMonthYear(currentMonth),
    [currentMonth]
  );
  const today = new Date();

  const goPrev = () => setCurrentMonth((m) => addMonths(m, -1));
  const goNext = () => setCurrentMonth((m) => addMonths(m, 1));

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() =>
              startTransition(() => {
                router.push("/customer");
              })
            }
            className="flex items-center text-gray-600 hover:text-gray-800 disabled:opacity-60"
            disabled={isRouting}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Inline spinner while routing — no overlay */}
          {isRouting ? <LogoSpinner show={true} /> : null}
        </div>
      </div>

      <div className="px-3 pb-10">
        {/* Summary Card */}
        <div className="bg-black text-white rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="text-[11px] text-gray-300">Name</div>
              <div className="text-sm font-medium">{PROFILE.name}</div>

              <div className="text-[11px] text-gray-300 mt-3">Savings Plan</div>
              <div className="text-sm font-medium">{PROFILE.planLabel}</div>

              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] text-gray-300">Status</span>
                <span className="inline-flex items-center rounded-md bg-emerald-600/20 text-emerald-300 text-[11px] px-2 py-0.5">
                  <CircleDot className="w-3 h-3 mr-1" />
                  {PROFILE.status}
                </span>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div className="text-[11px] text-gray-300">Total Saved</div>
              <div className="text-sm font-semibold">
                ₦{PROFILE.totalSaved.toFixed(2)}
              </div>

              <div className="text-[11px] text-gray-300 mt-3">
                Withdrawal Date
              </div>
              <div className="text-sm font-medium">
                {PROFILE.withdrawalDate}
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 text-gray-200">
                <Phone className="w-3.5 h-3.5 opacity-80" />
                <span className="text-[11px]">{PROFILE.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="mt-4 rounded-2xl border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold">
              {monthLabel} <span className="align-middle">▾</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goNext}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Weekdays */}
          <div className="mt-3 grid grid-cols-7 text-[13px] font-semibold text-gray-700">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="py-2 text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-2">
            {matrix.flat().map((cell, idx) => {
              const { date, inMonth } = cell;
              const isToday = isSameDay(date, today);

              const base =
                "h-10 rounded-xl text-sm flex items-center justify-center transition-colors";
              const cls = !inMonth
                ? "bg-gray-100 text-gray-400"
                : isToday
                ? "bg-gray-900 text-white"
                : "border border-gray-200 text-gray-900 hover:bg-gray-50";

              return (
                <button
                  key={idx}
                  className={`${base} ${cls}`}
                  onClick={() => {}}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Recent Transactions</div>
            <button
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 disabled:opacity-60"
              onClick={() =>
                startTransition(() => {
                  router.push("/users/transactions");
                })
              }
              disabled={isRouting}
            >
              {isRouting ? <LogoSpinner show={true} /> : "See all"}
            </button>
          </div>

          {TX.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/uploads/Empty State.png"
                alt="No recent transactions"
                className="h-28 object-contain opacity-90"
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {TX.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {t.type}
                    </div>
                    <div className="text-[11px] text-gray-500">{t.date}</div>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      t.type === "deposit"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {t.type === "deposit" ? "+" : "-"}₦
                    {t.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Normal (non-sticky) actions */}
        <div className="mt-5 flex gap-3">
          <button className="flex-1 h-11 rounded-xl border border-gray-300 text-gray-800 font-semibold">
            Withdraw
          </button>
          <button className="flex-1 h-11 rounded-xl bg-black text-white font-semibold hover:bg-black/90">
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}
