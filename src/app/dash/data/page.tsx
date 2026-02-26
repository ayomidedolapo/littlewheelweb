"use client";

// app/(billpay)/mobile-data/page.tsx
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------------- types ---------------- */
type Txn = {
  id: string;
  title: string;
  datetime: string;
  amount: number; // negative = debit, positive = credit
};

type NetworkKey = "mtn" | "airtel" | "glo" | "9mobile";

type Network = {
  key: NetworkKey;
  name: string;
  logo: string; // local public path
};

type PlanBucket = "Daily" | "Weekly" | "Monthly";

type DataPlan = {
  id: string;
  bucket: PlanBucket;
  sizeLabel: string; // e.g. 100MB
  validityLabel: string; // e.g. 1 Day
  price: number; // naira
};

/* ---------------- data ---------------- */
const NETWORKS: Network[] = [
  { key: "mtn", name: "MTN", logo: "/uploads/mtn.webp" },
  { key: "airtel", name: "Airtel", logo: "/uploads/airtel.webp" },
  { key: "glo", name: "Glo", logo: "/uploads/glo.webp" },
  { key: "9mobile", name: "9mobile", logo: "/uploads/9mobile.webp" },
];

// ✅ matches screenshot: same repeated plan cards
const PLANS: DataPlan[] = [
  // Daily (6 cards)
  { id: "d1", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },
  { id: "d2", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },
  { id: "d3", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },
  { id: "d4", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },
  { id: "d5", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },
  { id: "d6", bucket: "Daily", sizeLabel: "100MB", validityLabel: "1 Day", price: 1000 },

  // Weekly (optional – keep same structure for later)
  { id: "w1", bucket: "Weekly", sizeLabel: "1GB", validityLabel: "7 Days", price: 1500 },
  { id: "w2", bucket: "Weekly", sizeLabel: "2GB", validityLabel: "7 Days", price: 2500 },
  { id: "w3", bucket: "Weekly", sizeLabel: "3GB", validityLabel: "7 Days", price: 3500 },
  { id: "w4", bucket: "Weekly", sizeLabel: "5GB", validityLabel: "7 Days", price: 5500 },
  { id: "w5", bucket: "Weekly", sizeLabel: "10GB", validityLabel: "7 Days", price: 9500 },
  { id: "w6", bucket: "Weekly", sizeLabel: "500MB", validityLabel: "7 Days", price: 900 },

  // Monthly (optional – keep same structure for later)
  { id: "m1", bucket: "Monthly", sizeLabel: "5GB", validityLabel: "30 Days", price: 6500 },
  { id: "m2", bucket: "Monthly", sizeLabel: "10GB", validityLabel: "30 Days", price: 10500 },
  { id: "m3", bucket: "Monthly", sizeLabel: "15GB", validityLabel: "30 Days", price: 14500 },
  { id: "m4", bucket: "Monthly", sizeLabel: "20GB", validityLabel: "30 Days", price: 18500 },
  { id: "m5", bucket: "Monthly", sizeLabel: "30GB", validityLabel: "30 Days", price: 25500 },
  { id: "m6", bucket: "Monthly", sizeLabel: "50GB", validityLabel: "30 Days", price: 40500 },
];

const transactions: Txn[] = [
  { id: "t1", title: "Mobile Data", datetime: "Mar 4th, 02:46:32", amount: -10000 },
  { id: "t2", title: "Mobile Data", datetime: "Mar 4th, 02:46:32", amount: 10000 },
];

/* ---------------- helpers ---------------- */
function formatNairaValue(n: number) {
  return `₦${(n || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNairaSigned(n: number) {
  const abs = Math.abs(n);
  return `${n < 0 ? "-" : "+"}₦${abs.toLocaleString("en-NG")}`;
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function NetworkAvatar({
  src,
  alt,
  size = 28,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        className="flex items-center justify-center rounded-full border border-gray-100 bg-gray-200 text-[10px] font-bold text-gray-700"
        style={{ width: size, height: size }}
        aria-label={alt}
      >
        {alt?.slice(0, 1)?.toUpperCase() ?? "N"}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-full border border-gray-100 bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setBroken(true)}
        sizes={`${size}px`}
      />
    </div>
  );
}

/* ---------------- page ---------------- */
export default function MobileDataPage() {
  const router = useRouter();

  // ✅ same overlay spinner pattern as your withdraw + airtime
  const [submitting, setSubmitting] = useState(false);
  const [loadingUI, setLoadingUI] = useState(false);
  const overlayOn = submitting || loadingUI;

  // ✅ Transaction summary bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // network dropdown state
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkKey>("mtn");
  const [networkOpen, setNetworkOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // form state
  const [phone, setPhone] = useState(""); // digits only

  // plan tabs + selection
  const [bucket, setBucket] = useState<PlanBucket>("Daily");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const currentNetwork = useMemo(
    () => NETWORKS.find((n) => n.key === selectedNetwork) ?? NETWORKS[0],
    [selectedNetwork]
  );

  const phoneDigits = phone.replace(/\D/g, "");
  const plansForBucket = useMemo(
    () => PLANS.filter((p) => p.bucket === bucket),
    [bucket]
  );

  const selectedPlan = useMemo(
    () => PLANS.find((p) => p.id === selectedPlanId) ?? null,
    [selectedPlanId]
  );

  const canPay = phoneDigits.length >= 10 && !!selectedPlan;

  // close dropdown on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      const target = e.target as Node;
      if (!dropdownRef.current.contains(target)) setNetworkOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onPayClick() {
    if (!canPay || overlayOn) return;
    setSheetOpen(true);
  }

  async function onConfirmPay() {
    if (!canPay || overlayOn) return;
    setSubmitting(true);
    try {
      // TODO: integrate billpay API later
      await new Promise((r) => setTimeout(r, 600));
      setSheetOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const summaryDate = useMemo(() => formatDateLong(new Date()), []);

  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      <LogoSpinner show={overlayOn} invert />

      {/* ✅ same Back structure */}
      <div className="sticky top-0 z-10 bg-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 p-3 text-gray-900"
          disabled={overlayOn}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="text-[14px] font-semibold">Back</span>
        </button>
      </div>

      <div className="mx-auto w-full max-w-md px-4 pb-12">
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Mobile Data</h1>

        {/* Mobile Number (same as Airtime) */}
        <div className="mt-6">
          <p className="mb-2 text-sm text-gray-700">Mobile Number</p>

          <div className="relative flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2">
            {/* Network dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-1 py-1"
                aria-label="Select network"
                onClick={() => setNetworkOpen((v) => !v)}
                disabled={overlayOn}
              >
                <NetworkAvatar src={currentNetwork.logo} alt={currentNetwork.name} size={28} />

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  className="text-gray-700"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>

              {networkOpen ? (
                <div className="absolute left-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  {NETWORKS.map((n) => {
                    const active = n.key === selectedNetwork;
                    return (
                      <button
                        key={n.key}
                        type="button"
                        onClick={() => {
                          setSelectedNetwork(n.key);
                          setNetworkOpen(false);
                        }}
                        className={[
                          "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                          active ? "bg-gray-100" : "bg-white hover:bg-gray-50",
                        ].join(" ")}
                        disabled={overlayOn}
                      >
                        <NetworkAvatar src={n.logo} alt={n.name} size={24} />
                        <span className="text-gray-900">{n.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Number-only input */}
            <input
              className="flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="0803xxxxxxx"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneDigits}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 11);
                setPhone(next);
              }}
              disabled={overlayOn}
            />

            {/* Contact redirect button */}
            <Link
              href="airtime/contacts"
              className={[
                "relative h-5 w-8 shrink-0 overflow-hidden rounded-sm",
                overlayOn ? "pointer-events-none opacity-70" : "",
              ].join(" ")}
              aria-label="Pick from contacts"
            >
              <Image
                src="/uploads/frame%20black%20b.png"
                alt="Contacts"
                fill
                className="object-cover"
                priority
              />
            </Link>
          </div>
        </div>

        {/* Data Plans */}
        <div className="mt-5">
          <p className="mb-2 text-sm text-gray-700">Data Plans</p>

          {/* Tabs */}
          <div className="flex items-center gap-2">
            {(["Daily", "Weekly", "Monthly"] as PlanBucket[]).map((t) => {
              const active = t === bucket;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setBucket(t);
                    setSelectedPlanId(null); // reset selection per tab
                  }}
                  disabled={overlayOn}
                  className={[
                    "h-9 rounded-sm px-4 text-sm font-medium transition",
                    active
                      ? "bg-black text-white"
                      : "bg-white text-gray-800 border border-gray-200",
                  ].join(" ")}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Plan grid (3 columns x 2 rows like screenshot) */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {plansForBucket.slice(0, 6).map((p) => {
              const active = p.id === selectedPlanId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  disabled={overlayOn}
                  className={[
                    "rounded-md border bg-gray-100 px-3 py-3 text-left transition",
                    active ? "border-black ring-1 ring-black" : "border-gray-100",
                  ].join(" ")}
                >
                  <p className="text-[14px] font-extrabold text-gray-900">{p.sizeLabel}</p>
                  <p className="mt-1 text-[12px] text-gray-600">{p.validityLabel}</p>
                  <p className="mt-1 text-[12px] text-gray-700">₦{p.price.toLocaleString("en-NG")}</p>
                </button>
              );
            })}
          </div>

          {/* Pay button (disabled style like screenshot) */}
          <button
            type="button"
            onClick={onPayClick}
            disabled={!canPay || overlayOn}
            className={[
              "mt-5 w-full rounded-xl py-3 text-base font-semibold transition",
              canPay && !overlayOn
                ? "bg-black text-white active:scale-[0.99]"
                : "bg-gray-200 text-gray-600",
            ].join(" ")}
          >
            Pay
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="mt-7">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Transactions</p>
            <Link href="/transactions" className="text-sm text-gray-700 underline">
              See all
            </Link>
          </div>

          <div className="mt-3 space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl bg-white py-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                  {t.amount < 0 ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 7h10v10H7V7Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="text-red-500"
                      />
                      <path
                        d="M9 12h6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="text-red-500"
                      />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 7h10v10H7V7Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="text-amber-500"
                      />
                      <path
                        d="M12 9v6M9 12h6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        className="text-amber-500"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-600">{t.datetime}</p>
                </div>

                <p
                  className={[
                    "text-sm font-semibold",
                    t.amount < 0 ? "text-red-500" : "text-green-500",
                  ].join(" ")}
                >
                  {formatNairaSigned(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-3" />
      </div>

      {/* ---------------- Transaction Summary Bottom Sheet ---------------- */}
      <div
        className={`fixed inset-0 z-50 transition ${
          sheetOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!sheetOpen}
      >
        {/* Backdrop */}
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Sheet */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl
          transition-transform duration-300 ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="relative px-4 pt-3">
            <div className="mx-auto h-1 w-12 rounded-full bg-gray-200" />
            <button
              onClick={() => setSheetOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              aria-label="Close"
              disabled={overlayOn}
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>

            <h2 className="mt-4 text-[18px] font-extrabold text-gray-900">
              Transaction Summary
            </h2>
          </div>

          <div className="px-4 pb-5 pt-3">
            <div className="space-y-4">
              {/* ✅ Network bold only */}
              <SummaryRow label="Network" value={currentNetwork.name} strong />

              <SummaryRow label="Recipient mobile" value={phoneDigits || "—"} />

              {/* ✅ Plan row */}
              <SummaryRow
                label="Data plan"
                value={selectedPlan ? `${selectedPlan.sizeLabel} • ${selectedPlan.validityLabel}` : "—"}
              />

              {/* ✅ Amount in #099137 */}
              <SummaryRow
                label="Amount"
                value={formatNairaValue(selectedPlan?.price || 0)}
                isAmount
              />

              <SummaryRow label="Date" value={summaryDate} />
            </div>

            <button
              type="button"
              onClick={onConfirmPay}
              disabled={!canPay || overlayOn}
              className={[
                "mt-6 mb-4 w-full h-12 rounded-xl font-semibold transition",
                canPay && !overlayOn
                  ? "bg-black text-white hover:bg-black hover:text-white active:scale-[0.99]"
                  : "bg-gray-200 text-gray-500 opacity-70 cursor-not-allowed",
              ].join(" ")}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- tiny subcomponent ---------------- */
function SummaryRow({
  label,
  value,
  strong,
  valueClass = "",
  isAmount,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
  isAmount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-gray-600">{label}</span>

      <span
        className={[
          "text-[14px]",
          strong ? "font-semibold" : "font-normal",
          isAmount ? "font-extrabold" : "",
          valueClass,
        ].join(" ")}
        style={isAmount ? { color: "#099137" } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
