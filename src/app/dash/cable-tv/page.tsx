"use client";

// app/(billpay)/cable-tv/page.tsx
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, ChevronDown } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------------- types ---------------- */
type ProviderKey = "dstv" | "gotv" | "startimes";

type Provider = {
  key: ProviderKey;
  name: string; // display
};

type DurationKey = "monthly" | "quarterly" | "yearly";

type Duration = {
  key: DurationKey;
  name: string;
};

type CablePlan = {
  id: string;
  provider: ProviderKey;
  duration: DurationKey;
  title: string; // e.g. GOtv Jinja
  durationLabel: string; // e.g. 1 Month
  price: number; // 3900
};

type Txn = {
  id: string;
  title: string;
  datetime: string;
  amount: number;
};

/* ---------------- constants (UI-only placeholders) ---------------- */
const PROVIDERS: Provider[] = [
  { key: "dstv", name: "DSTV" },
  { key: "gotv", name: "GOtv" },
  { key: "startimes", name: "Startimes" },
];

const DURATIONS: Duration[] = [
  { key: "monthly", name: "Monthly" },
  { key: "quarterly", name: "Quarterly" },
  { key: "yearly", name: "Yearly" },
].filter(Boolean) as Duration[];

// Matches screenshot: 6 cards, same text/price.
const PLANS: CablePlan[] = [
  { id: "p1", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
  { id: "p2", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
  { id: "p3", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
  { id: "p4", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
  { id: "p5", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
  { id: "p6", provider: "gotv", duration: "monthly", title: "GOtv Jinja", durationLabel: "1 Month", price: 3900 },
];

const transactions: Txn[] = [
  { id: "t1", title: "Cable TV", datetime: "Mar 4th, 02:46:32", amount: -10000 },
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

/* ---------------- page ---------------- */
export default function CableTvPage() {
  const router = useRouter();

  // overlay pattern
  const [submitting, setSubmitting] = useState(false);
  const [loadingUI, setLoadingUI] = useState(false);
  const overlayOn = submitting || loadingUI;

  // bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // dropdowns
  const [providerOpen, setProviderOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);

  const [provider, setProvider] = useState<ProviderKey>("dstv");
  const [duration, setDuration] = useState<DurationKey>("monthly");

  // form
  const [smartcard, setSmartcard] = useState("");

  // error pill (like screenshot)
  const [smartcardError, setSmartcardError] = useState(false);

  // plans selection
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const currentProvider = useMemo(
    () => PROVIDERS.find((p) => p.key === provider) ?? PROVIDERS[0],
    [provider]
  );

  const currentDuration = useMemo(
    () => DURATIONS.find((d) => d.key === duration) ?? DURATIONS[0],
    [duration]
  );

  const plans = useMemo(() => {
    // UI: show the GOtv cards regardless, but structure supports filtering
    return PLANS.filter((p) => {
      // if provider is DSTV, still show the cards as placeholders unless you want empty.
      // For strict UI match with screenshot, keep them visible always.
      if (!p) return false;
      return true;
    });
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const smartcardDigits = smartcard.replace(/\D/g, "");
  const canPay = smartcardDigits.length >= 8 && !!selectedPlan;

  function onPayClick() {
    if (!canPay || overlayOn) return;
    setSheetOpen(true);
  }

  async function onConfirmPay() {
    if (!canPay || overlayOn) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setSheetOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  // demo: show error pill when user leaves smartcard empty and tries to pay
  function triggerErrorIfNeeded() {
    // In real flow, backend validation sets this.
    if (smartcardDigits.length < 8) setSmartcardError(true);
  }

  // close dropdowns when opening another
  useEffect(() => {
    if (providerOpen) setDurationOpen(false);
  }, [providerOpen]);
  useEffect(() => {
    if (durationOpen) setProviderOpen(false);
  }, [durationOpen]);

  const summaryDate = useMemo(() => formatDateLong(new Date()), []);

  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      <LogoSpinner show={overlayOn} invert />

      {/* Back (same pattern) */}
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
        <h1 className="mt-1 text-[20px] font-extrabold text-gray-900">CABLE TV</h1>

        {/* Choose Provider */}
        <div className="mt-6">
          <p className="mb-2 text-sm text-gray-700">Choose Provider</p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProviderOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-3"
            >
              <span className="text-[14px] text-gray-900">{currentProvider.name}</span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>

            {providerOpen ? (
              <div className="absolute left-0 top-[52px] z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {PROVIDERS.map((p) => {
                  const active = p.key === provider;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setProvider(p.key);
                        setProviderOpen(false);
                        setSelectedPlanId(null);
                      }}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        active ? "bg-gray-100" : "bg-white hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <span className="text-gray-900">{p.name}</span>
                      {active ? <span className="text-xs text-gray-500">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Smartcard Number */}
        <div className="mt-5">
          <p className="mb-2 text-sm text-gray-700">Smartcard Number</p>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
            <input
              className="w-full bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Enter Your Smartcard Number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={smartcardDigits}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 16);
                setSmartcard(next);
                if (smartcardError) setSmartcardError(false);
              }}
              disabled={overlayOn}
            />
          </div>

          {/* Error pill like screenshot */}
          {smartcardError ? (
            <div className="mt-3 inline-flex rounded-full bg-[#E24B4B] px-4 py-1.5">
              <span className="text-[12px] font-medium text-white">
                Incorrect Details. Try again
              </span>
            </div>
          ) : null}
        </div>

        {/* Select Duration */}
        <div className="mt-5">
          <p className="mb-2 text-sm text-gray-700">Select Duration</p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDurationOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-3"
            >
              <span className="text-[14px] text-gray-900">{currentDuration.name}</span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>

            {durationOpen ? (
              <div className="absolute left-0 top-[52px] z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {DURATIONS.map((d) => {
                  const active = d.key === duration;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        setDuration(d.key);
                        setDurationOpen(false);
                        setSelectedPlanId(null);
                      }}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        active ? "bg-gray-100" : "bg-white hover:bg-gray-50",
                      ].join(" ")}
                    >
                      <span className="text-gray-900">{d.name}</span>
                      {active ? <span className="text-xs text-gray-500">Selected</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Plan Grid (3 columns x 2 rows) */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {plans.slice(0, 6).map((p) => {
            const active = p.id === selectedPlanId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlanId(p.id)}
                disabled={overlayOn}
                className={[
                  "rounded-xl border bg-[#F4F6F9] px-3 py-3 text-left transition",
                  active ? "border-black ring-1 ring-black" : "border-transparent",
                ].join(" ")}
              >
                <p className="text-[14px] font-extrabold text-gray-900">{p.title}</p>
                <p className="mt-1 text-[12px] text-gray-700">{p.durationLabel}</p>
                <p className="mt-1 text-[12px] text-gray-700">
                  ₦{p.price.toLocaleString("en-NG")}
                </p>
              </button>
            );
          })}
        </div>

        {/* Pay button (disabled grey like screenshot) */}
        <button
          type="button"
          onClick={() => {
            triggerErrorIfNeeded();
            onPayClick();
          }}
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
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-white py-2"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
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
                </div>

                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{t.title}</p>
                  <p className="text-xs text-gray-600">{t.datetime}</p>
                </div>

                <p className="text-sm font-semibold text-red-500">
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
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />

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
              {/* Provider */}
              <SummaryRow
                label="Provider"
                value={currentProvider.name === "DSTV" ? "GOtv" : currentProvider.name}
                strong
              />

              {/* Package */}
              <SummaryRow
                label="Package"
                value={selectedPlan ? selectedPlan.title.replace("GOtv ", "Gotv ") + " Max" : "—"}
              />

              {/* Amount (green #099137) */}
              <SummaryRow
                label="Amount"
                value={formatNairaValue(selectedPlan?.price || 0)}
                isAmount
              />

              {/* Date */}
              <SummaryRow label="Date" value={summaryDate} />
            </div>

            <button
              type="button"
              onClick={onConfirmPay}
              disabled={!canPay || overlayOn}
              className={[
                "mt-6 mb-4 w-full h-12 rounded-xl font-semibold transition",
                canPay && !overlayOn
                  ? "bg-black text-white hover:bg-black/90 active:scale-[0.99]"
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
          "text-[14px] text-gray-900",
          strong ? "font-semibold" : "font-normal",
          valueClass,
        ].join(" ")}
        style={isAmount ? { color: "#099137", fontWeight: 800 } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
