"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  ArrowDownCircle,
  ArrowUpRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* money fmt */
const NGN = (n: number) =>
  `₦${(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

/* calendar helpers (Mon-first) */
type DayCell = { day: number | null; iso?: string };
function makeMonthGrid(year: number, monthIndex: number): DayCell[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  // JS: 0=Sun..6=Sat -> convert to Mon-first (Mon=1..Sun=7)
  const firstDow = ((first.getDay() + 6) % 7) + 1; // 1..7
  const lead = firstDow - 1; // 0..6 leading blanks
  const cells: DayCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ day: null });
  for (let d = 1; d <= last.getDate(); d++) {
    const iso = new Date(year, monthIndex, d).toISOString();
    cells.push({ day: d, iso });
  }
  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push({ day: null });
  return cells;
}

export default function VaultViewPage() {
  const router = useRouter();

  // Demo vault state (tweak freely)
  const vaultName = "Junior School fee";
  const amountSaved = 30000;
  const amountLeft = 10500;
  const progressPct = 15;

  // Calendar state (default July 2025)
  const [year, setYear] = useState(2025);
  const [month, setMonth] = useState(6); // 0=Jan .. 6=Jul
  const days = useMemo(() => makeMonthGrid(year, month), [year, month]);
  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [year, month]
  );
  const prevMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() - 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    d.setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  // Demo marked days
  const savedDays = new Set([1, 2, 3, 4, 5, 6]); // green
  const missedDays = new Set([7]); // red

  // Recent tx (demo)
  const txs = [
    {
      id: "t1",
      type: "withdraw",
      note: "Withdraw",
      at: "Mar 4th, 02:46:32",
      amount: -10000,
    },
    {
      id: "t2",
      type: "deposit",
      note: "Saved",
      at: "Mar 4th, 02:46:32",
      amount: +20000,
    },
  ];

  // Bottom sheets
  const [showAllTx, setShowAllTx] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const closeVault = () => {
    setConfirmClose(false);
    // do your API action later; for now navigate back
    router.back();
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .sheet {
          animation: slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .gridBG {
          background-image: linear-gradient(
              rgba(255, 255, 255, 0.08) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.08) 1px,
              transparent 1px
            );
          background-size: 64px 64px, 64px 64px;
          background-position: 0 0, 0 0;
        }
      `}</style>

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Hero Card */}
        <div className="px-4">
          <div className="relative rounded-2xl bg-black text-white p-5 gridBG">
            {/* vault image top-right */}
            <div className="absolute right-3 top-3 h-9 w-9 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/uploads/Little wheel personal vault bw 1.png"
                alt="Vault"
                className="h-6 w-6 object-contain"
              />
            </div>

            <div className="flex items-center gap-1 text-[12px] text-white/85">
              <span>Amount Saved</span>
              <Eye className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 text-[28px] leading-none font-extrabold tracking-tight">
              {NGN(amountSaved)}
            </div>

            {/* name + amount-left row */}
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex rounded-full px-3 py-1 bg-white/10 ring-1 ring-white/15 text-[12px]">
                {vaultName}
              </span>
              <span className="text-[13px] text-white/90">
                Amount left: <strong>{NGN(amountLeft)}</strong>
              </span>
            </div>

            {/* progress */}
            <div className="mt-3">
              <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progressPct}%`, opacity: 0.95 }}
                />
              </div>
              <div className="text-right text-[12px] mt-1">{progressPct}%</div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="px-4 mt-4">
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-white">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold">{monthLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-3 py-3 bg-white">
              {/* Week headers (Mon-first) */}
              <div className="grid grid-cols-7 text-[11px] text-gray-500 px-1 mb-2">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-2">
                {days.map((c, i) => {
                  const d = c.day;
                  const base =
                    "h-10 rounded-xl border text-sm flex items-center justify-center";
                  if (d === null)
                    return (
                      <div
                        key={`b${i}`}
                        className="h-10 rounded-xl bg-gray-50 border border-gray-100"
                      />
                    );
                  const saved = savedDays.has(d);
                  const missed = missedDays.has(d);
                  const cls = saved
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800 font-semibold"
                    : missed
                    ? "border-red-200 bg-red-100 text-red-700 font-semibold"
                    : "border-gray-200 bg-gray-50 text-gray-800";
                  return (
                    <div key={i} className={`${base} ${cls}`}>
                      {d}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="px-4 mt-5 pb-24">
          {" "}
          {/* extra bottom space for sticky button */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
              <h3 className="text-[13px] font-semibold">Recent Transactions</h3>
              <button
                onClick={() => setShowAllTx(true)}
                className="text-[12px] text-gray-600"
              >
                See all
              </button>
            </div>

            <div className="bg-white">
              {txs.map((t, i) => {
                const isLast = i === txs.length - 1;
                const positive = t.amount > 0;
                return (
                  <div
                    key={t.id}
                    className={`px-4 py-3 flex items-center justify-between ${
                      !isLast ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-200">
                        {positive ? (
                          <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {t.note}
                        </p>
                        <p className="text-[11px] text-gray-500">{t.at}</p>
                      </div>
                    </div>

                    {/* red “Close vault” pill for the withdraw row (demo) */}
                    {!positive ? (
                      <div className="mr-3 hidden sm:block" />
                    ) : null}

                    <div
                      className={`text-[13px] font-semibold ${
                        positive ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {positive ? "+" : "−"}
                      {NGN(Math.abs(t.amount))}
                    </div>
                  </div>
                );
              })}

              {/* Banner-like pill aligned like screenshot (shown on first row demo) */}
              <div className="px-4 pb-3">
                <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-red-50 text-red-600 px-3 py-2">
                  <X className="w-4 h-4" />
                  <span className="text-[12px] font-medium">Close vault</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Close Button (always visible while scrolling) */}
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
        >
          <button
            onClick={() => setConfirmClose(true)}
            className="w-[92vw] max-w-sm h-12 rounded-2xl bg-black text-white font-semibold shadow-xl active:scale-[0.99] transition"
          >
            Close Vault
          </button>
        </div>
      </div>

      {/* SEE ALL TX – bottom sheet */}
      {showAllTx && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAllTx(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />
            <h4 className="text-base font-semibold mb-3">All Transactions</h4>
            <div className="max-h-[55vh] overflow-auto space-y-3 pr-1">
              {txs.concat(txs, txs).map((t, i) => (
                <div
                  key={`${t.id}-${i}`}
                  className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-200">
                      {t.amount > 0 ? (
                        <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {t.note}
                      </p>
                      <p className="text-[11px] text-gray-500">{t.at}</p>
                    </div>
                  </div>
                  <div
                    className={`text-[13px] font-semibold ${
                      t.amount > 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {t.amount > 0 ? "+" : "−"}
                    {NGN(Math.abs(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CLOSE – bottom sheet */}
      {confirmClose && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmClose(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-4" />
            <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-red-50 ring-2 ring-red-100 flex items-center justify-center">
              <X className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Close this vault?
            </h3>
            <p className="text-sm text-gray-600 text-center mt-1">
              You can reopen or create a new vault later.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmClose(false)}
                className="h-12 rounded-xl border border-gray-300 text-gray-800 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={closeVault}
                className="h-12 rounded-xl bg-black text-white font-semibold"
              >
                Close vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
