"use client";

// app/(billpay)/electricity/page.tsx
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------------- types ---------------- */
type ProviderKey = "ibedc" | "ikedc" | "ekedc" | "aedc";

type Provider = {
  key: ProviderKey;
  name: string;
};

type PackageKey = "postpaid" | "prepaid";

type Package = {
  key: PackageKey;
  name: string;
};

/* ---------------- constants (UI placeholders) ---------------- */
const PROVIDERS: Provider[] = [
  { key: "ibedc", name: "Ibadan Electricity" },
  { key: "ikedc", name: "Ikeja Electricity" },
  { key: "ekedc", name: "Eko Electricity" },
  { key: "aedc", name: "Abuja Electricity" },
];

const PACKAGES: Package[] = [
  { key: "postpaid", name: "POSTPAID" },
  { key: "prepaid", name: "PREPAID" },
];

/* ---------------- helpers ---------------- */
const parseNG = (s: string) => Number(String(s || "").replace(/[^\d]/g, "")) || 0;

const formatWithCommas = (rawDigits: string) => {
  const clean = String(rawDigits || "").replace(/[^\d]/g, "");
  if (!clean) return "";
  const n = Number(clean);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-NG");
};

/* ---------------- page ---------------- */
export default function ElectricityPage() {
  const router = useRouter();

  // overlay spinner pattern (same as others)
  const [submitting] = useState(false);
  const [loadingUI] = useState(false);
  const overlayOn = submitting || loadingUI;

  // dropdowns
  const [providerOpen, setProviderOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);

  // ✅ start with no selection (placeholders on screen)
  const [provider, setProvider] = useState<ProviderKey | null>(null);
  const [pkg, setPkg] = useState<PackageKey | null>(null);

  // form
  const [meter, setMeter] = useState(""); // digits only
  const [amountRaw, setAmountRaw] = useState(""); // digits only

  // green badge
  const [meterBadge, setMeterBadge] = useState("Ile iya Akure Meter");

  const currentProvider = useMemo(
    () => (provider ? PROVIDERS.find((p) => p.key === provider) ?? null : null),
    [provider]
  );

  const currentPackage = useMemo(
    () => (pkg ? PACKAGES.find((p) => p.key === pkg) ?? null : null),
    [pkg]
  );

  // close one dropdown when the other opens
  useEffect(() => {
    if (providerOpen) setPackageOpen(false);
  }, [providerOpen]);
  useEffect(() => {
    if (packageOpen) setProviderOpen(false);
  }, [packageOpen]);

  const meterDigits = meter.replace(/\D/g, "");
  const amountNum = parseNG(amountRaw);
  const amountValue = formatWithCommas(amountRaw);

  const canPay = !!provider && !!pkg && meterDigits.length >= 6 && amountNum > 0;

  const setQuickAmount = (label: string) => {
    const n = parseNG(label);
    setAmountRaw(String(n));
  };

  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      <LogoSpinner show={overlayOn} invert />

      {/* Back */}
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
        <h1 className="mt-1 text-[18px] font-extrabold text-gray-900">
          ELECTRICITY
        </h1>

        {/* Choose Provider */}
        <div className="mt-6">
          <p className="mb-2 text-[12px] text-gray-700">Choose Provider</p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProviderOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-3"
            >
              <span
                className={[
                  "text-[13px]",
                  currentProvider ? "text-gray-900" : "text-gray-400",
                ].join(" ")}
              >
                {currentProvider?.name ?? "Choose a provider"}
              </span>
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
                      }}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        active ? "bg-gray-100" : "bg-white hover:bg-gray-50",
                      ].join(" ")}
                      disabled={overlayOn}
                    >
                      <span className="text-gray-900">{p.name}</span>
                      {active ? (
                        <span className="text-xs text-gray-500">Selected</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Select Package */}
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-gray-700">Select Package</p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setPackageOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-3"
            >
              <span
                className={[
                  "text-[13px]",
                  currentPackage ? "text-gray-900" : "text-gray-400",
                ].join(" ")}
              >
                {currentPackage?.name ?? "Select your package"}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>

            {packageOpen ? (
              <div className="absolute left-0 top-[52px] z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {PACKAGES.map((p) => {
                  const active = p.key === pkg;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setPkg(p.key);
                        setPackageOpen(false);
                      }}
                      className={[
                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm",
                        active ? "bg-gray-100" : "bg-white hover:bg-gray-50",
                      ].join(" ")}
                      disabled={overlayOn}
                    >
                      <span className="text-gray-900">{p.name}</span>
                      {active ? (
                        <span className="text-xs text-gray-500">Selected</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Meter Number */}
        <div className="mt-4">
          <p className="mb-2 text-[12px] text-gray-700">Meter Number</p>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
            <input
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Enter Your Meter Number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={meterDigits}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 16);
                setMeter(next);
                if (next.length >= 6) setMeterBadge("Ile iya Akure Meter");
              }}
              disabled={overlayOn}
            />
          </div>

          {/* green pill badge */}
          {meterDigits.length >= 6 ? (
            <div className="mt-3 inline-flex rounded-full bg-[#1DAF63] px-4 py-1.5">
              <span className="text-[12px] font-medium text-white">
                {meterBadge}
              </span>
            </div>
          ) : null}
        </div>

        {/* Amount */}
        <div className="mt-5">
          <p className="mb-2 text-[12px] text-gray-700">Amount</p>

          <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
            <input
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="₦0.00"
              inputMode="numeric"
              pattern="[0-9]*"
              value={amountValue ? `₦${amountValue}` : "₦0.00"}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d]/g, "");
                setAmountRaw(raw);
              }}
              disabled={overlayOn}
            />
          </div>

          {/* Quick amount buttons */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {["₦500", "₦1000", "₦5000", "₦10000"].map((x) => (
              <button
                key={x}
                type="button"
                onClick={() => setQuickAmount(x)}
                className="rounded-lg bg-gray-100 px-0 py-2 text-[12px] font-medium text-gray-800 active:scale-[0.99]"
                disabled={overlayOn}
              >
                {x}
              </button>
            ))}
          </div>

          {/* Pay button */}
          <button
            type="button"
            disabled={!canPay || overlayOn}
            className={[
              "mt-4 w-full rounded-xl py-3 text-[14px] font-semibold transition",
              canPay && !overlayOn
                ? "bg-black text-white active:scale-[0.99]"
                : "bg-gray-200 text-gray-600",
            ].join(" ")}
          >
            Pay
          </button>
        </div>

        {/* Recent Transactions (empty state) */}
        <div className="mt-7">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              Recent Transactions
            </p>
            <Link
              href="/transactions"
              className="text-sm text-gray-700 underline"
            >
              See all
            </Link>
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <div className="relative h-20 w-28">
              <Image
                src="/uploads/undraw.png"
                alt="No recent purchases"
                fill
                className="object-contain"
                priority
              />
            </div>

            <p className="mt-4 text-[12px] font-extrabold text-gray-900">
              You have no Recent Purchases
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              You don’t have any recent purchase at this time
            </p>
          </div>
        </div>

        <div className="pb-3" />
      </div>
    </div>
  );
}
