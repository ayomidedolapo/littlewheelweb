/* app/commission/withdraw/page.tsx */
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserRound, Landmark, X } from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner"; // ← ✅ logo loader

/* ---------------- money helpers ---------------- */
const fmt = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const QUICK = [2000, 5000, 10000, 20000];
const SERVICE_FEE_PERCENT = 30; // preview only; backend is source of truth

type Method = "RECHARGE" | "BANK" | "";
type SavedBank = {
  bank: { name: string; code?: string | number; logo?: string };
  accountNumber: string;
  accountName: string;
};

/* ---------------- comma helpers ---------------- */
const parseNG = (s: string) => Number(String(s || "").replace(/[^\d]/g, "")) || 0;

const formatWithCommas = (rawDigits: string) => {
  const clean = String(rawDigits || "").replace(/[^\d]/g, "");
  if (!clean) return "";
  const n = Number(clean);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-NG");
};

/* ---------------- helpers for bank display ---------------- */
function bankLogoUrl(name: string, provided?: string) {
  if (provided) return provided;
  const key = name.trim().toLowerCase();
  const override: Record<string, string> = {
    "access bank": "https://nigerianbanks.xyz/logo/access-bank.png",
    "access bank (diamond)":
      "https://nigerianbanks.xyz/logo/access-bank-diamond.png",
    "alat by wema": "https://nigerianbanks.xyz/logo/alat-by-wema.png",
    "ecobank nigeria": "https://nigerianbanks.xyz/logo/ecobank-nigeria.png",
    "first bank of nigeria":
      "https://nigerianbanks.xyz/logo/first-bank-of-nigeria.png",
    "first city monument bank":
      "https://nigerianbanks.xyz/logo/first-city-monument-bank.png",
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
  return `https://nigerianbanks.xyz/logo/${name
    .toLowerCase()
    .replace(/\s+/g, "-")}.png`;
}
const toTitle = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const maskAcct = (acct: string) => {
  const d = (acct || "").replace(/\D/g, "");
  if (d.length <= 4) return d;
  return "******" + d.slice(-4);
};

const getBearer = () => {
  try {
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("lw_token") ||
      localStorage.getItem("lw_auth") ||
      ""
    );
  } catch {
    return "";
  }
};

/* ---------------- page ---------------- */
export default function CommissionWithdrawalPage() {
  const router = useRouter();

  // live balances
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceErr, setBalanceErr] = useState<string | null>(null);

  // saved withdrawal method (bank)
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [loadingBank, setLoadingBank] = useState(true);

  // form state
  const [amountRaw, setAmountRaw] = useState<string>(""); // raw digits only
  const [method, setMethod] = useState<Method>("");
  const [pin, setPin] = useState(""); // PIN required by API (max 5 digits)

  // summary bottom sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const tokenHeader = getBearer();

  /* ---------- Load commission balance (DASHBOARD-COMPATIBLE) ---------- */
  const loadCommissionBalance = useCallback(async () => {
    setLoadingBalance(true);
    setBalanceErr(null);

    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    try {
      // Primary: same endpoint used on dashboard
      const r = await fetch("/api/v1/agent/balances", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
      });

      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text || "{}");
      } catch {}

      if (r.ok) {
        const d = j?.data || j || {};
        const commission = toNum(
          d.commissionBalance ??
            d?.balances?.commission ??
            d?.commission?.available ??
            0
        );
        setAvailableBalance(commission);
        return;
      }

      // Fallback: /api/user/me
      const r2 = await fetch("/api/user/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
      });
      const t2 = await r2.text();
      let j2: any = {};
      try {
        j2 = JSON.parse(t2 || "{}");
      } catch {}
      if (!r2.ok) throw new Error(j?.message || `HTTP ${r.status}`);
      const u = j2?.user || j2?.data || j2 || {};
      const commission = toNum(
        u?.commissionBalance ??
          u?.balances?.commission ??
          u?.commission?.available ??
          u?.earnings?.commission ??
          u?.commission ??
          0
      );
      setAvailableBalance(commission);
    } catch (e: any) {
      setBalanceErr(e?.message || "Couldn’t load balance.");
    } finally {
      setLoadingBalance(false);
    }
  }, [tokenHeader]);

  // Initial load + refresh hooks
  useEffect(() => {
    loadCommissionBalance();
  }, [loadCommissionBalance]);

  useEffect(() => {
    const onFocus = () => loadCommissionBalance();
    const onVisible = () => {
      if (document.visibilityState === "visible") loadCommissionBalance();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadCommissionBalance]);

  // Load saved withdrawal bank (GET)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingBank(true);
        const res = await fetch("/api/v1/settings/withdrawal-method", {
          credentials: "include",
          headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
          cache: "no-store",
        });

        const text = await res.text();
        const json = (() => {
          try {
            return JSON.parse(text || "{}");
          } catch {
            return {};
          }
        })();

        if (!res.ok) {
          const raw = localStorage.getItem("lw_withdrawal_bank");
          if (raw && !cancelled) setSavedBank(JSON.parse(raw));
          return;
        }

        const d = json?.data || json?.method || json || {};
        if (
          (d as any)?.accountNumber &&
          (d as any)?.accountName &&
          (d as any)?.bankName &&
          !cancelled
        ) {
          const s: SavedBank = {
            bank: {
              name: (d as any).bankName,
              code: (d as any).bankCode,
              logo: (d as any).logoUrl,
            },
            accountNumber: String((d as any).accountNumber),
            accountName: String((d as any).accountName),
          };
          setSavedBank(s);
          try {
            localStorage.setItem("lw_withdrawal_bank", JSON.stringify(s));
          } catch {}
        } else {
          const raw = localStorage.getItem("lw_withdrawal_bank");
          if (raw && !cancelled) setSavedBank(JSON.parse(raw));
        }
      } finally {
        if (!cancelled) setLoadingBank(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tokenHeader]);

  // derived
  const parsedAmount = useMemo(() => parseNG(amountRaw), [amountRaw]);

  const fee = useMemo(
    () => (parsedAmount > 0 ? (SERVICE_FEE_PERCENT / 100) * parsedAmount : 0),
    [parsedAmount]
  );
  const net = Math.max(parsedAmount - fee, 0);

  const amountValid =
    parsedAmount > 0 &&
    parsedAmount <= (availableBalance || 0) &&
    Number.isFinite(fee);

  const pinValid = pin.trim().length >= 4 && pin.trim().length <= 5; // ✅ max 5 digits

  const bankReady = !!savedBank;
  const canProceed =
    amountValid && !!method && (method === "BANK" ? bankReady : true);

  // 🔁 Toggle method (click again to deselect)
  const toggleMethod = (next: Method) => {
    setMethod((current) => (current === next ? "" : next));
  };

  const setQuick = (val: number | "ALL") => {
    if (val === "ALL") setAmountRaw(String(availableBalance || 0));
    else setAmountRaw(String(val));
  };

  const openSheet = () => {
    if (!canProceed) return;
    setSubmitErr(null);
    setSheetOpen(true);
  };

  async function onConfirm() {
    if (!canProceed || !pinValid || submitting) return;
    setSubmitting(true);
    setSubmitErr(null);

    try {
      const target =
        method === "RECHARGE" ? "recharge_balance" : "bank_account";
      const payload = {
        amount: String(parsedAmount),
        target,
        password: pin.trim(),
      };

      const res = await fetch("/api/v1/agent/commission/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenHeader ? { "x-lw-auth": tokenHeader } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          json?.upstream?.message ||
          `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // success → close sheet, reset, and redirect to /dash
      setSheetOpen(false);
      setPin("");
      setAmountRaw("");
      setMethod("");

      try {
        localStorage.setItem("lw_balance_dirty", String(Date.now()));
      } catch {}

      await loadCommissionBalance();
      router.push("/dash");
    } catch (e: any) {
      setSubmitErr(e?.message || "Withdrawal failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const overlayOn = submitting;

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      {/* 🔥 Logo spinner overlay for submitting / loading */}
      <LogoSpinner
        show={overlayOn || loadingBalance || loadingBank}
        invert
        blurStrength={1.2}
      />

      {/* Top Bar */}
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
        <h1 className="text-[18px] font-extrabold text-gray-900">
          Commission Withdrawal
        </h1>
        <p className="text-[11px] text-gray-500 mt-0.5">
          Request your earned commissions
        </p>
      </div>

      {/* Amount Card */}
      <div className="px-4 mt-3">
        <div className="rounded-2xl bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-gray-100 p-3.5">
          <label className="block text-[11px] font-semibold text-gray-800 mb-1.5">
            Amount to withdraw
          </label>
          <div className="h-11 rounded-xl ring-1 ring-gray-200 focus-within:ring-black bg-white flex items-center px-3">
            {/* ✅ comma formatted display, raw digits stored */}
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Amount"
              value={formatWithCommas(amountRaw)}
              onChange={(e) => {
                const raw = e.target.value
                  .replace(/,/g, "")
                  .replace(/[^\d]/g, "");
                setAmountRaw(raw);
              }}
              className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder:text-gray-400"
              aria-label="Amount to withdraw"
              disabled={overlayOn}
            />
          </div>

          <p className="mt-1.5 text-[11px] text-gray-500">
            Available balance:{" "}
            <span className="font-semibold text-gray-900">
              {loadingBalance ? "—" : fmt(availableBalance)}
            </span>
          </p>
          {balanceErr && (
            <p className="text-[11px] text-rose-600 mt-1" role="alert">
              {balanceErr}
            </p>
          )}

          {/* Quick amount buttons */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              onClick={() => setQuick("ALL")}
              className="h-8 px-3 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-800"
              disabled={overlayOn}
            >
              All
            </button>
            {QUICK.map((v) => (
              <button
                key={v}
                onClick={() => setQuick(v)}
                className="h-8 px-3 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-800"
                disabled={overlayOn}
              >
                {fmt(v).replace(".00", "")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Method Card */}
      <div className="px-4 mt-4">
        <p className="text-[11px] font-semibold text-gray-800 mb-2">
          Set a withdrawal method
        </p>

        <div className="rounded-2xl bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
          {/* Recharge Balance */}
          <button
            type="button"
            onClick={() => toggleMethod("RECHARGE")}
            className="w-full flex items-center justify-between px-3.5 py-3"
            disabled={overlayOn}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                <UserRound className="h-5 w-5 text-black" />
              </span>
              <div className="text-left min-w-0">
                <p className="text-[13px] leading-snug font-semibold text-gray-900 truncate">
                  Recharge Balance
                </p>
                <p className="text-[11px] leading-snug text-gray-500 truncate">
                  Convert to your credit balance
                </p>
              </div>
            </div>
            <span
              className={`h-[18px] w-[18px] rounded-full border-2 ${
                method === "RECHARGE"
                  ? "border-black bg-black ring-2 ring-black/30"
                  : "border-gray-300 bg-transparent"
              }`}
              aria-hidden
            />
          </button>

          <div className="h-px bg-gray-100 mx-3.5" />

          {/* Bank Account */}
          <button
            type="button"
            onClick={() => toggleMethod("BANK")}
            className="w-full flex items-center justify-between px-3.5 py-3"
            disabled={overlayOn}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                <Landmark className="h-5 w-5 text-black" />
              </span>
              <div className="text-left min-w-0">
                <p className="text-[13px] leading-snug font-semibold text-gray-900 truncate">
                  Bank Account
                </p>
                <p className="text-[11px] leading-snug text-gray-500 truncate">
                  {loadingBank
                    ? "Loading your saved bank…"
                    : savedBank
                    ? "Withdraw to your bank account"
                    : "No bank set. Add one in Settings → Withdrawal Bank."}
                </p>
              </div>
            </div>
            <span
              className={`h-[18px] w-[18px] rounded-full border-2 ${
                method === "BANK"
                  ? "border-black bg-black ring-2 ring-black/30"
                  : "border-gray-300 bg-transparent"
              }`}
              aria-hidden
            />
          </button>

          {/* Black account details card */}
          {method === "BANK" && savedBank && (
            <div className="px-3.5 pb-3">
              <div className="mt-1 w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                    <Image
                      src={bankLogoUrl(
                        savedBank.bank.name,
                        savedBank.bank.logo
                      )}
                      alt={savedBank.bank.name}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold leading-tight">
                      {toTitle(savedBank.accountName || "—")}
                    </div>
                    <div className="text-[12px] text-white/70 mt-0.5">
                      {maskAcct(savedBank.accountNumber)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* warning */}
        {method === "BANK" && !savedBank && !loadingBank && (
          <p className="mt-2 text-[11px] text-rose-600">
            You need to set a withdrawal bank first (Settings → Withdrawal
            Bank).
          </p>
        )}
      </div>

      {/* Primary CTA */}
      <div className="px-4 mt-6 pb-8">
        <button
          onClick={openSheet}
          disabled={!canProceed || overlayOn}
          className={`w-full h-11 rounded-xl text-white font-semibold transition
            ${
              canProceed && !overlayOn
                ? "bg-black active:scale-[0.99]"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
        >
          Withdraw
        </button>
        {!amountValid && (
          <p className="mt-2 text-[11px] text-gray-500">
            Enter a valid amount (≤ available balance).
          </p>
        )}
        {amountValid && !method && (
          <p className="mt-2 text-[11px] text-gray-500">
            Select a withdrawal method to continue.
          </p>
        )}
      </div>

      {/* Bottom Sheet */}
      <div
        className={`fixed inset-0 z-50 transition ${
          sheetOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!sheetOpen}
      >
        <div
          onClick={() => setSheetOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl
          transition-transform duration-300 ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="p-4 pb-3 flex items-center justify-between">
            <h3 className="text-[14px] font-extrabold text-gray-900">
              Withdrawal Summary
            </h3>
            <button
              onClick={() => setSheetOpen(false)}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Close summary"
              disabled={overlayOn}
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="space-y-3">
              <Row label="Amount" value={fmt(parsedAmount)} strong />
              <Row
                label="Service Fee"
                value={`-${SERVICE_FEE_PERCENT}%`}
                valueClass="text-rose-600 font-semibold"
              />
              {method === "BANK" && savedBank && (
                <>
                  <div className="h-px bg-gray-100" />
                  <Row
                    label="Destination"
                    value={`${savedBank.bank.name} (${maskAcct(
                      savedBank.accountNumber
                    )})`}
                    valueClass="text-gray-900"
                  />
                </>
              )}
              <div className="h-px bg-gray-100" />
              <Row
                label="Will Receive"
                value={fmt(net)}
                valueClass="text-emerald-600 font-extrabold"
              />
            </div>

            {/* Password / PIN */}
            <div className="mt-4">
              <label className="block text-[11px] font-semibold text-gray-800 mb-1.5">
                Password / PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5} // ✅ hard cap in UI
                value={pin}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d]/g, "").slice(0, 5); // ✅ hard cap in state
                  setPin(next);
                }}
                placeholder="Enter your PIN"
                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-black"
                aria-label="Password or PIN"
                disabled={overlayOn}
              />
              {pin.trim().length > 0 && pin.trim().length < 4 && (
                <p className="mt-1 text-[11px] text-gray-500">
                  
                </p>
              )}
              {pin.trim().length === 5 && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Maximum: 5 digits.
                </p>
              )}
            </div>

            {/* Error */}
            {submitErr && (
              <div
                className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800 flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  !
                </span>
                <p className="flex-1">{submitErr}</p>
              </div>
            )}

            <button
              onClick={onConfirm}
              disabled={
                !pinValid || submitting || (method === "BANK" && !savedBank)
              }
              className={`mt-4 mb-4 w-full h-11 rounded-xl text-white font-semibold transition
                ${
                  !pinValid || submitting || (method === "BANK" && !savedBank)
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-black active:scale-[0.99]"
                }`}
            >
              {submitting ? "Submitting…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>

      <div className="pb-3" />
    </div>
  );
}

/* ---------------- tiny subcomponent ---------------- */
function Row({
  label,
  value,
  strong,
  valueClass = "",
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`text-[12px] ${
          strong ? "font-semibold text-gray-900" : "text-gray-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`text-[13px] ${
          strong ? "font-bold text-gray-900" : "text-gray-900"
        } ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}
