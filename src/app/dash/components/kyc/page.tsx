/* app/dash/components/kyc/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";

/* ---------- small helpers (reused from withdraw page) ---------- */
function bankLogoUrl(name: string, provided?: string) {
  if (provided) return provided;
  const key = (name || "").trim().toLowerCase();
  const override: Record<string, string> = {
    "access bank": "https://nigerianbanks.xyz/logo/access-bank.png",
    "access bank (diamond)":
      "https://nigerianbanks.xyz/logo/access-bank-diamond.png",
    "alat by wema": "https://nigerianbanks.xyz/logo/alat-by-wema.png",
    "ecobank nigeria": "https://nigerianbanks.xyz/logo/ecobank-nigeria.png",
    "first bank of nigeria":
      "https://nigerianbanks.xyz/logo/first-bank-of-nigeria.png",
    "first city monument bank":
      "https://nigerianbanks.xyz/logo/first-city-monu ment-bank.png".replace(
        " ",
        ""
      ),
    "guaranty trust bank":
      "https://nigerianbanks.xyz/logo/guaranty-trust-bank.png",
    "kuda bank": "https://nigerianbanks.xyz/logo/kuda-bank.png",
    "moniepoint mfb": "https://nigerianbanks.xyz/logo/moniepoint-mfb-ng.png",
    opay: "https://nigerianbanks.xyz/logo/paycom.png",
    paycom: "https://nigerianbanks.xyz/logo/paycom.png",
    palmpay: "https://nigerianbanks.xyz/logo/palmpay.png",
    "polaris bank": "https://nigerianbanks.xyz/logo/polaris-bank.png",
    "stanbic ibtc bank": "https://nigerianbanks.xyz/logo/stanbic-ibtc-bank.png",
    "standard chartered bank":
      "https://nigerianbanks.xyz/logo/standard-chartered-bank.png",
    "sterling bank": "https://nigerianbanks.xyz/logo/sterling-bank.png",
    "taj bank": "https://nigerianbanks.xyz/logo/taj-bank.png",
    "union bank of nigeria":
      "https://nigerianbanks.xyz/logo/union-bank-of-nigeria.png",
    "united bank for africa":
      "https://nigerianbanks.xyz/logo/united-bank-for-africa.png",
    "wema bank": "https://nigerianbanks.xyz/logo/wema-bank.png",
    "zenith bank": "https://nigerianbanks.xyz/logo/zenith-bank.png",
  };
  if (override[key]) return override[key];
  return `https://nigerianbanks.xyz/logo/${(name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")}.png`;
}
const toTitle = (s: string) =>
  (s || "")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
const maskAcct = (acct?: string) => {
  const d = (acct || "").replace(/\D/g, "");
  if (d.length <= 4) return d;
  return "******" + d.slice(-4);
};

type SavedBank = {
  bank: { name: string; code?: string | number; logo?: string };
  accountNumber: string;
  accountName: string;
};

export default function TierTwoPage() {
  const router = useRouter();

  // BVN
  const [bvn, setBvn] = useState("");
  const bvnValid = useMemo(() => /^\d{11}$/.test(bvn), [bvn]);

  // Bank (loaded like your withdraw page)
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [loadingBank, setLoadingBank] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingBank(true);

        // Try API first
        const res = await fetch("/api/v1/settings/withdrawal-method", {
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(text || "{}");
        } catch {}

        if (res.ok) {
          const d = json?.data || json?.method || json || {};
          if (d?.accountNumber && d?.accountName && d?.bankName && !cancelled) {
            const s: SavedBank = {
              bank: {
                name: String(d.bankName),
                code: d.bankCode,
                logo: d.logoUrl,
              },
              accountNumber: String(d.accountNumber),
              accountName: String(d.accountName),
            };
            setSavedBank(s);
            try {
              localStorage.setItem("lw_withdrawal_bank", JSON.stringify(s));
            } catch {}
            return;
          }
        }

        // Fallback to local cache if API not set
        const raw = localStorage.getItem("lw_withdrawal_bank");
        if (raw && !cancelled) setSavedBank(JSON.parse(raw));
      } finally {
        if (!cancelled) setLoadingBank(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Proceed → store BVN+bank for next (selfie) step
  const canProceed = bvnValid && !!savedBank;
  const onProceed = () => {
    if (!canProceed) return;
    try {
      sessionStorage.setItem("tier2_bvn", bvn);
      sessionStorage.setItem("tier2_bank", JSON.stringify(savedBank));
    } catch {}
    router.push("/dash/components/kyc/selfie"); // next page for selfie + POST /api/v1/user/upgrade-tier
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 p-3 text-gray-900"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="text-[14px] font-semibold">Back</span>
        </button>
      </div>

      {/* Title */}
      <div className="px-4">
        <h1 className="text-[20px] font-extrabold text-gray-900">
          Upgrade to Tier 2
        </h1>
      </div>

      {/* BVN input card */}
      <div className="px-4 mt-4">
        <label className="block text-[12px] font-semibold text-gray-800 mb-1.5">
          Enter your BVN
        </label>
        <div className="h-12 rounded-xl ring-1 ring-gray-200 focus-within:ring-black bg-white flex items-center px-3">
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={11}
            value={bvn}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 11);
              setBvn(d);
            }}
            placeholder="Enter your 11 digits"
            className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder:text-gray-400"
            aria-label="BVN"
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Dial <span className="font-semibold">*565*0#</span> to get your BVN
        </p>
      </div>

      {/* Bank chip (black card) */}
      <div className="px-4 mt-5">
        <div className="w-full rounded-2xl bg-black text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded bg-white overflow-hidden flex items-center justify-center">
              {savedBank?.bank?.name ? (
                <Image
                  src={bankLogoUrl(savedBank.bank.name, savedBank.bank.logo)}
                  alt={savedBank.bank.name}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-300" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">
                {savedBank
                  ? toTitle(savedBank.accountName)
                  : loadingBank
                  ? "Loading bank…"
                  : "No bank set"}
              </div>
              <div className="text-[12px] text-white/80 mt-0.5 truncate">
                {savedBank
                  ? `${savedBank.bank.name} (${maskAcct(
                      savedBank.accountNumber
                    )})`
                  : "Set a withdrawal bank in Settings"}
              </div>
            </div>
          </div>

          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white text-black">
            <Check className="w-4 h-4" />
          </span>
        </div>
      </div>

      {/* Benefits card */}
      <div className="px-4 mt-5">
        <div className="rounded-2xl bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-gray-100 p-4">
          <p className="text-[13px] font-semibold text-gray-900 mb-2">
            Benefits:
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-emerald-600/20 bg-emerald-50">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              <p className="text-[12px] text-gray-800">
                A virtual account would be created for you.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-emerald-600/20 bg-emerald-50">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </span>
              <p className="text-[12px] text-gray-800">
                Upgraded to Level 2 automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress + Proceed */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-gray-100 p-4">
          <div className="flex items-center justify-between text-[12px] text-gray-800 mb-2">
            <span className="font-semibold">Enter BVN Information</span>
            <span>1/2</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-2 rounded-full bg-emerald-600 transition-all"
              style={{ width: "35%" }}
              aria-hidden
            />
          </div>

          <button
            onClick={onProceed}
            disabled={!canProceed}
            className={`mt-4 w-full h-12 rounded-2xl text-white font-semibold
              ${
                canProceed
                  ? "bg-black active:scale-[0.99]"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
          >
            Proceed
          </button>
        </div>
      </div>

      <div className="pb-6" />
    </div>
  );
}
