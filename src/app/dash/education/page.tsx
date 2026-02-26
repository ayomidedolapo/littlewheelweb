"use client";

// app/(billpay)/education/page.tsx
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------------- types ---------------- */
type ProviderKey = "jamb" | "waec" | "neco";

type Provider = {
  key: ProviderKey;
  name: string;
};

type PackageKey = "direct_entry_epin" | "utme_epin" | "waec_pin" | "neco_pin";

type Package = {
  key: PackageKey;
  name: string;
  provider: ProviderKey;
};

/* ---------------- constants (UI placeholders) ---------------- */
const PROVIDERS: Provider[] = [
  { key: "jamb", name: "JAMB" },
  { key: "waec", name: "WAEC" },
  { key: "neco", name: "NECO" },
];

const PACKAGES: Package[] = [
  { key: "direct_entry_epin", name: "Direct Entry ePin", provider: "jamb" },
  { key: "utme_epin", name: "UTME ePin", provider: "jamb" },
  { key: "waec_pin", name: "WAEC PIN", provider: "waec" },
  { key: "neco_pin", name: "NECO PIN", provider: "neco" },
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
export default function EducationPage() {
  const router = useRouter();

  // overlay pattern
  const [submitting] = useState(false);
  const [loadingUI] = useState(false);
  const overlayOn = submitting || loadingUI;

  // dropdowns
  const [providerOpen, setProviderOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);

  // ✅ screenshot shows defaults selected (JAMB + Direct Entry ePin)
  const [provider, setProvider] = useState<ProviderKey>("jamb");
  const [pkg, setPkg] = useState<PackageKey>("direct_entry_epin");

  // form
  const [phone, setPhone] = useState(""); // digits only
  const [amountRaw, setAmountRaw] = useState(""); // digits only

  const currentProvider = useMemo(
    () => PROVIDERS.find((p) => p.key === provider) ?? PROVIDERS[0],
    [provider]
  );

  const packageOptions = useMemo(
    () => PACKAGES.filter((p) => p.provider === provider),
    [provider]
  );

  const currentPackage = useMemo(() => {
    const found = packageOptions.find((p) => p.key === pkg);
    return found ?? packageOptions[0];
  }, [pkg, packageOptions]);

  // close one dropdown when the other opens
  useEffect(() => {
    if (providerOpen) setPackageOpen(false);
  }, [providerOpen]);
  useEffect(() => {
    if (packageOpen) setProviderOpen(false);
  }, [packageOpen]);

  // keep pkg valid when provider changes
  useEffect(() => {
    if (!packageOptions.some((p) => p.key === pkg)) {
      setPkg(packageOptions[0]?.key ?? "direct_entry_epin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const phoneDigits = phone.replace(/\D/g, "");
  const amountNum = parseNG(amountRaw);
  const amountValue = formatWithCommas(amountRaw);

  const canPay = phoneDigits.length >= 10 && amountNum > 0;

  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      <LogoSpinner show={overlayOn} invert />

      {/* Back (same pattern as your other pages) */}
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
        <h1 className="mt-1 text-[22px] font-extrabold text-gray-900">
          EDUCATION
        </h1>

        {/* Choose Provider */}
        <div className="mt-6">
          <p className="mb-2 text-[13px] font-medium text-gray-700">
            Choose Provider
          </p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setProviderOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-4"
            >
              <span className="text-[14px] text-gray-900">
                {currentProvider.name}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>

            {providerOpen ? (
              <div className="absolute left-0 top-[60px] z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
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
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
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

        {/* Package */}
        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-gray-700">Package</p>

          <div className="relative">
            <button
              type="button"
              onClick={() => setPackageOpen((v) => !v)}
              disabled={overlayOn}
              className="w-full flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-4"
            >
              <span className="text-[14px] text-gray-900">
                {currentPackage?.name ?? "Select package"}
              </span>
              <ChevronDown className="h-5 w-5 text-gray-600" />
            </button>

            {packageOpen ? (
              <div className="absolute left-0 top-[60px] z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                {packageOptions.map((p) => {
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
                        "flex w-full items-center justify-between px-4 py-3 text-left text-sm",
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

        {/* Phone Number */}
        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-gray-700">
            Phone Number
          </p>

          <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
            <input
              className="w-full bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="e.g 08103779499"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneDigits}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, "").slice(0, 11);
                setPhone(next);
              }}
              disabled={overlayOn}
            />
          </div>
        </div>

        {/* Amount */}
        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-gray-700">Amount</p>

          <div className="rounded-md border border-gray-200 bg-white px-4 py-4">
            <input
              className="w-full bg-transparent text-[14px] text-gray-900 outline-none placeholder:text-gray-400"
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
        </div>

        {/* Pay (disabled grey like screenshot) */}
        <button
          type="button"
          disabled={!canPay || overlayOn}
          className={[
            "mt-6 w-full rounded-xl py-4 text-[15px] font-semibold transition",
            canPay && !overlayOn
              ? "bg-black text-white active:scale-[0.99]"
              : "bg-gray-200 text-gray-600",
          ].join(" ")}
        >
          Pay
        </button>

        <div className="pb-3" />
      </div>
    </div>
  );
}
