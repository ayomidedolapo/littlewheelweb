"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../../../../../components/loaders/LogoSpinner"; // ✅ use your spinner

/* ---------------- Types ---------------- */
type Bank = { name: string; code: string | number; logo?: string };
type SavedBank = { bank: Bank; accountNumber: string; accountName: string };

/* ---------------- Helpers ---------------- */
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
function toTitle(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
function maskAcct(num: string) {
  const d = (num || "").replace(/\D/g, "");
  if (d.length <= 4) return d;
  return "******" + d.slice(-4);
}

export default function WithdrawalBank() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // entry state (for editing/changing)
  const [bank, setBank] = useState<Bank | null>(null);
  const [acct, setAcct] = useState("");

  // resolved name + resolving state
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const resolveAbort = useRef<AbortController | null>(null);

  // saved card (BACKEND is source of truth)
  const [saved, setSaved] = useState<SavedBank | null>(null);

  // ui
  const [pickerOpen, setPickerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true); // overlay during initial fetch

  const tokenHeader =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") ||
        localStorage.getItem("lw_token") ||
        ""
      : "";

  /**
   * ✅ IMPORTANT FIX:
   * - Do NOT read any saved card from localStorage.
   * - Do NOT write any saved card to localStorage.
   * This guarantees a new account on the same device will NOT see old bank cards.
   */

  /* Load saved display from backend (backend is source of truth) */
  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      // always reset UI state before fetching (prevents stale card flashes)
      setSaved(null);
      setInitialLoading(true);

      try {
        const r = await fetch("/api/v1/settings/withdrawal-method", {
          cache: "no-store",
          headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
          credentials: "include",
        });

        const text = await r.text();
        let j: any = {};
        try {
          j = JSON.parse(text || "{}");
        } catch {}

        if (!r.ok) {
          // backend says no/err → show nothing
          if (!cancelled) setSaved(null);
          return;
        }

        const d = j?.data || j?.method || j;
        const bankName =
          d?.bankName || d?.bank?.name || d?.bank_name || d?.bank || "";
        const bankCode =
          d?.bankCode || d?.bank?.code || d?.bank_code || d?.code || "";
        const logoUrl =
          d?.logoUrl || d?.bank?.logo || d?.logo || d?.bank_logo || "";
        const accountNumber =
          d?.accountNumber || d?.account_number || d?.account || "";
        const accountName = d?.accountName || d?.account_name || d?.name || "";

        // ✅ If backend has NO bank for this user, make sure nothing is shown
        if (!bankName || !accountNumber) {
          if (!cancelled) setSaved(null);
          return;
        }

        const s: SavedBank = {
          bank: {
            name: bankName,
            code: bankCode,
            logo: bankLogoUrl(bankName, logoUrl),
          },
          accountNumber: String(accountNumber),
          accountName: String(accountName || ""),
        };

        if (!cancelled) setSaved(s);
      } catch {
        // network error → STILL show nothing (no local cache fallback)
        if (!cancelled) setSaved(null);
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    loadSaved();
    return () => {
      cancelled = true;
    };
  }, [tokenHeader]);

  // clear name when editing
  useEffect(() => {
    setResolvedName("");
    setError(null);
  }, [bank, acct]);

  // ► Resolve name as soon as bank chosen + 10 digits typed (before confirm)
  useEffect(() => {
    const digits = acct.replace(/\D/g, "");
    if (!bank || digits.length !== 10) {
      resolveAbort.current?.abort();
      return;
    }

    const t = setTimeout(async () => {
      try {
        setResolving(true);
        resolveAbort.current?.abort();
        const ac = new AbortController();
        resolveAbort.current = ac;

        const r = await fetch(
          `/api/v1/payments/resolve-account-number?accountNumber=${digits}&bankCode=${bank.code}`,
          {
            headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
            credentials: "include",
            signal: ac.signal,
          }
        );

        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = json?.message || json?.error || `HTTP ${r.status}`;
          throw new Error(msg);
        }

        const name =
          json?.data?.accountName ||
          json?.data?.account_name ||
          json?.accountName ||
          json?.account_name ||
          "";

        setResolvedName(name || "");
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setResolvedName("");
          setError(e instanceof Error ? e.message : "Name resolve failed");
        }
      } finally {
        setResolving(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [bank, acct, tokenHeader]);

  const canSubmitBase = !!bank && acct.replace(/\D/g, "").length === 10;
  const canSubmit = canSubmitBase && !!resolvedName && !resolving && !saving;

  async function onConfirm() {
    try {
      setError(null);
      if (!canSubmit) return;

      setSaving(true);
      const logoUrl = bankLogoUrl(bank!.name, bank?.logo);

      const payload = {
        bankName: bank!.name,
        logoUrl,
        bankCode: bank!.code,
        accountNumber: acct,
        accountName: resolvedName,
      };

      const res = await fetch("/api/v1/settings/withdrawal-method", {
        method: saved ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(tokenHeader ? { "x-lw-auth": tokenHeader } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Refresh saved card from backend (source of truth)
      try {
        const g = await fetch("/api/v1/settings/withdrawal-method", {
          cache: "no-store",
          headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
          credentials: "include",
        });
        const gj = await g.json().catch(() => ({}));
        if (g.ok) {
          const d = gj?.data || gj?.method || gj;
          const s: SavedBank = {
            bank: {
              name: d?.bankName || bank!.name,
              code: d?.bankCode || bank!.code,
              logo: bankLogoUrl(
                d?.bankName || bank!.name,
                d?.logoUrl || bank!.logo
              ),
            },
            accountNumber: d?.accountNumber || acct,
            accountName: d?.accountName || resolvedName,
          };
          setSaved(s);
        } else {
          // if backend didn’t return properly, still rely on current input
          setSaved({
            bank: { name: bank!.name, code: bank!.code, logo: logoUrl },
            accountNumber: acct,
            accountName: resolvedName,
          });
        }
      } catch {
        // ignore
      }

      // Reset edit state
      setBank(null);
      setAcct("");
      setResolvedName("");
      setSuccessOpen(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save withdrawal method"
      );
    } finally {
      setSaving(false);
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  };

  const overlayOn = isPending || saving || initialLoading; // ← show logo overlay for these
  const disableAll = overlayOn;

  /* ===================== RENDER ===================== */

  const hasSaved = !!saved;
  const showAcctInput = !hasSaved || (!!hasSaved && !!bank);

  return (
    <div className="min-h-screen bg-white" aria-busy={overlayOn}>
      {/* global logo overlay */}
      <LogoSpinner show={overlayOn} invert />

      <div className="max-w-sm mx-auto px-5 pt-4">
        {/* Header */}
        <button
          onClick={() => startTransition(() => router.back())}
          className="flex items-center gap-2 text-gray-700 hover:text-black disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={disableAll}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="mt-4 text-[22px] font-extrabold text-black">
          Withdrawal Bank
        </h1>
        <p className="mt-2 text-[13px] text-gray-700">
          Your funds will be sent here instantly when you withdraw from Little
          Wheel.
        </p>

        {/* Saved card (ONLY if backend confirms it exists) */}
        {hasSaved && (
          <div className="mt-5">
            <div className="w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                  <Image
                    src={bankLogoUrl(saved!.bank.name, saved!.bank.logo)}
                    alt={saved!.bank.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-tight">
                    {toTitle(saved!.accountName || "—")}
                  </div>
                  <div className="text-[12px] text-white/70 mt-0.5">
                    {maskAcct(saved!.accountNumber)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => copy(saved!.accountNumber)}
                className="p-2 rounded-lg hover:bg-white/10 transition"
                aria-label="Copy account number"
                disabled={disableAll}
              >
                <Copy className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Change bank → only a selector first */}
            <div className="mt-4">
              <label className="block text-[12px] text-gray-700 mb-1">
                {bank ? "Change to" : "Change your bank"}
              </label>
              <button
                onClick={() => !disableAll && setPickerOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between disabled:opacity-60"
                disabled={disableAll}
              >
                <div className="flex items-center gap-2">
                  {bank ? (
                    <Image
                      src={bankLogoUrl(bank.name, bank.logo)}
                      alt={bank.name}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  ) : null}
                  <span className={bank ? "text-gray-900" : "text-gray-400"}>
                    {bank ? bank.name : "Select Bank"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Entry / Edit form for first-time user */}
        {!hasSaved && (
          <>
            <label className="block mt-5 text-[12px] text-gray-700 mb-1">
              Bank name
            </label>

            <button
              onClick={() => !disableAll && setPickerOpen(true)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between disabled:opacity-60"
              disabled={disableAll}
            >
              <div className="flex items-center gap-2">
                {bank ? (
                  <Image
                    src={bankLogoUrl(bank.name, bank.logo)}
                    alt={bank.name}
                    width={18}
                    height={18}
                    className="object-contain"
                  />
                ) : null}
                <span className={bank ? "text-gray-900" : "text-gray-400"}>
                  {bank ? bank.name : "Select Bank"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </>
        )}

        {/* Account number input */}
        {showAcctInput && (
          <div className="mt-5">
            <label className="block text-[12px] text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="e.g 3120221108"
              value={acct}
              onChange={(e) =>
                setAcct(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-[13px] outline-none disabled:opacity-60"
              disabled={disableAll}
            />
          </div>
        )}

        {/* Resolve chip */}
        {showAcctInput && resolvedName && (
          <div className="mt-3 w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                {bank && (
                  <Image
                    src={bankLogoUrl(bank.name, bank.logo)}
                    alt={bank.name}
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                )}
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">
                  {toTitle(resolvedName)}
                </div>
                <div className="text-[12px] text-white/70 mt-0.5">
                  {maskAcct(acct)}
                </div>
              </div>
            </div>
            <button
              onClick={() => copy(acct)}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Copy account number"
              disabled={disableAll}
            >
              <Copy className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Error – styled */}
        {error && (
          <div
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 mt-[2px]" />
            <p>{error}</p>
          </div>
        )}

        {/* Confirm */}
        {showAcctInput && (
          <button
            onClick={onConfirm}
            disabled={
              !(!!bank && acct.replace(/\D/g, "").length === 10) ||
              !resolvedName ||
              resolving ||
              saving
            }
            className={`mt-5 mb-8 w-full h-12 rounded-xl font-semibold text-white transition ${
              !!bank &&
              acct.replace(/\D/g, "").length === 10 &&
              resolvedName &&
              !resolving &&
              !saving
                ? "bg-black hover:bg-black/90"
                : "bg-black/30 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : resolving ? "Resolving…" : "Confirm Bank"}
          </button>
        )}
      </div>

      {/* Bank picker bottom sheet */}
      {pickerOpen && (
        <BankPickerSheet
          onClose={() => setPickerOpen(false)}
          onPick={(b) => {
            setPickerOpen(false);
            setBank(b);
            setAcct("");
            setResolvedName("");
          }}
        />
      )}

      {/* Success bottom sheet */}
      <SuccessSheet
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        text="You’ve successfully added a new bank account"
      />
    </div>
  );
}

/* ---------------- Picker & Success ---------------- */

function BankPickerSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (b: Bank) => void;
}) {
  const [q, setQ] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const tokenHeader =
    typeof window !== "undefined"
      ? localStorage.getItem("authToken") ||
        localStorage.getItem("lw_token") ||
        ""
      : "";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch("/api/v1/payments/bank-list", {
          headers: tokenHeader ? { "x-lw-auth": tokenHeader } : undefined,
          credentials: "include",
        });

        const json = await r.json().catch(() => ({}));

        const raw = json?.data || json;
        if (Array.isArray(raw)) setBanks(raw as Bank[]);
        else if (Array.isArray(json)) setBanks(json as Bank[]);
        else throw new Error("Unexpected bank list response");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load banks");
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenHeader]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return banks;
    return banks.filter((b) => String(b.name).toLowerCase().includes(t));
  }, [q, banks]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl">
        <div className="mx-auto max-w-sm p-4">
          <div className="h-1 w-12 rounded-full bg-gray-200 mx-auto mb-2" />
          <h3 className="text-[15px] font-semibold mb-3">Select Bank</h3>

          <div className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
            />
          </div>

          {loading ? (
            <div className="px-2 py-6 text-[13px] text-gray-500">
              Loading banks…
            </div>
          ) : err ? (
            <div className="px-2 py-4">
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                <AlertCircle className="w-4 h-4 mt-[2px]" />
                <p>{err}</p>
              </div>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto -mx-2">
              {list.map((b) => (
                <button
                  key={`${b.code}-${b.name}`}
                  onClick={() => onPick(b)}
                  className="w-full text-left px-2 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Image
                    src={bankLogoUrl(String(b.name), b.logo)}
                    alt={String(b.name)}
                    width={18}
                    height={18}
                    className="object-contain"
                  />
                  <span className="text-[13px] text-gray-900">{b.name}</span>
                </button>
              ))}
              {list.length === 0 && (
                <div className="px-2 py-6 text-[13px] text-gray-500">
                  No banks found.
                </div>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-4 w-full h-10 rounded-xl bg-gray-100 text-gray-800 text-[13px] font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessSheet({
  open,
  onClose,
  title,
  text,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-[13px] text-gray-600 mb-6">{text}</p>
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-black/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
