"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ListFilter, // <- use this icon
  Circle,
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* Types */
type Category = "deposit" | "withdraw" | "savings";
type Notice = {
  id: string;
  title: string;
  msg: string;
  category: Category;
  iso: string; // ISO timestamp
  ago: string; // e.g. "1hr"
  read?: boolean;
};

/* Helpers */
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function CategoryIcon({ cat }: { cat: Category }) {
  const cls =
    cat === "deposit"
      ? "bg-blue-50 text-blue-600 ring-blue-100"
      : cat === "withdraw"
      ? "bg-red-50 text-red-600 ring-red-100"
      : "bg-emerald-50 text-emerald-600 ring-emerald-100";
  const wrap =
    "h-9 w-9 rounded-full flex items-center justify-center ring-1 " + cls;

  if (cat === "deposit")
    return (
      <div className={wrap}>
        <Wallet className="w-5 h-5" />
      </div>
    );
  if (cat === "withdraw")
    return (
      <div className={wrap}>
        <ArrowUpRight className="w-5 h-5" />
      </div>
    );
  return (
    <div className={wrap}>
      <PiggyBank className="w-5 h-5" />
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();

  /* Start EMPTY to show the “No new notification” view now. 
     Later, setItems(...) from your API to show the list. */
  const [items, setItems] = useState<Notice[]>([]);

  // Bottom-sheet filter state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cat, setCat] = useState<"all" | Category>("all");
  const [start, setStart] = useState<string>(""); // dd-mm-yyyy
  const [end, setEnd] = useState<string>("");

  // Filtering
  const filtered = useMemo(() => {
    let list = items;
    if (cat !== "all") list = list.filter((n) => n.category === cat);

    const parseDMY = (s: string) => {
      const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s.trim());
      if (!m) return null;
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      return isNaN(d.getTime()) ? null : d;
    };

    const sDate = start ? parseDMY(start) : null;
    const eDate = end ? parseDMY(end) : null;
    if (sDate) sDate.setHours(0, 0, 0, 0);
    if (eDate) eDate.setHours(23, 59, 59, 999);

    if (sDate || eDate) {
      list = list.filter((n) => {
        const d = new Date(n.iso);
        if (sDate && d < sDate) return false;
        if (eDate && d > eDate) return false;
        return true;
      });
    }

    return [...list].sort((a, b) => +new Date(b.iso) - +new Date(a.iso));
  }, [items, cat, start, end]);

  // Group into Today / Yesterday (when data exists)
  const today = new Date();
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const groupToday = filtered.filter((n) => isSameDay(new Date(n.iso), today));
  const groupYest = filtered.filter((n) => isSameDay(new Date(n.iso), yest));

  const nothingToShow = filtered.length === 0;

  const markAllRead = () =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));

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
      `}</style>

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-extrabold">
              Notification
            </h1>
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Filter notifications"
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              <ListFilter className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Empty now; list later when items are set */}
        {nothingToShow ? (
          <div className="flex flex-col items-center justify-center h-[72vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/Group (1).png"
              alt="No notifications"
              className="h-20 w-20 object-contain opacity-80"
            />
            <p className="mt-4 text-sm font-semibold text-gray-700">
              No new notification
            </p>
          </div>
        ) : (
          <div className="pb-8">
            {/* Today */}
            {groupToday.length > 0 && (
              <>
                <SectionHeader
                  label="Today"
                  rightSlot={
                    <button
                      onClick={markAllRead}
                      className="text-[12px] text-gray-600 hover:underline"
                    >
                      Mark all as read
                    </button>
                  }
                />
                <div className="px-3">
                  {groupToday.map((n, i) => (
                    <NoticeRow
                      key={n.id}
                      n={n}
                      isLast={i === groupToday.length - 1}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Yesterday */}
            {groupYest.length > 0 && (
              <>
                <SectionHeader label="Yesterday" />
                <div className="px-3">
                  {groupYest.map((n, i) => (
                    <NoticeRow
                      key={n.id}
                      n={n}
                      isLast={i === groupYest.length - 1}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Filter Sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl sheet">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold">Filter Notification</h3>
              <button
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100"
              >
                <Circle className="w-4 h-4 rotate-45 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[12px] text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    placeholder="20-12-2001"
                    className="w-full h-11 rounded-xl border border-gray-200 px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                  <CalendarIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <input
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    placeholder="20-12-2001"
                    className="w-full h-11 rounded-xl border border-gray-200 px-3 pr-10 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                  <CalendarIcon className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-gray-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["all", "deposit", "withdraw", "savings"] as const).map(
                    (c) => (
                      <button
                        key={c}
                        onClick={() => setCat(c)}
                        className={`h-9 px-3 rounded-xl text-sm font-medium ${
                          cat === c
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {c === "all" ? "All" : c[0].toUpperCase() + c.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              <button
                onClick={() => setSheetOpen(false)}
                className="mt-1 w-full h-12 rounded-2xl bg-black text-white font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small components */
function SectionHeader({
  label,
  rightSlot,
}: {
  label: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <h3 className="text-[13px] font-semibold text-gray-900">{label}</h3>
      {rightSlot}
    </div>
  );
}

function NoticeRow({ n, isLast }: { n: Notice; isLast: boolean }) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-3 py-3 bg-white rounded-xl border border-gray-100 ${
        isLast ? "" : "mb-2"
      }`}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon cat={n.category} />
        <div>
          <p className="text-[13px] font-semibold text-gray-900">{n.title}</p>
          <p className="text-[12px] text-gray-600">{n.msg}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-[11px] text-gray-500">{n.ago}</span>
        {!n.read && (
          <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
        )}
      </div>
    </div>
  );
}
