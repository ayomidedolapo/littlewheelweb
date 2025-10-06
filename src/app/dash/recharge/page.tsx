/* app/recharge/credit/page.tsx */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ---------------- helpers ---------------- */
const fmt = (n: number) =>
  `₦${(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const parseNG = (s: string) => Number(String(s).replace(/[^\d]/g, "")) || 0;

type BankAccount = {
  id: string;
  name: string;
  logoUrls: string[];
  health: string;
  accountNumber: string;
};

type VirtualAccount = {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
};

/** Robust token lookup (cookie -> localStorage fallbacks) */
function getClientToken(): string {
  try {
    const m =
      typeof document !== "undefined"
        ? document.cookie.match(
            /(?:^|;\s*)(authToken|lw_auth|lw_token|token)\s*=\s*([^;]+)/
          )
        : null;
    if (m?.[2]) return decodeURIComponent(m[2]);
  } catch {}
  try {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("authToken") ||
      localStorage.getItem("lw_auth") ||
      localStorage.getItem("lw_token") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

/** Parse virtual account from flexible shapes (same idea as dashboard) */
function pickVirtualAccount(obj: any): VirtualAccount | null {
  if (!obj) return null;

  const direct = obj.virtualAccount || obj.virtual_account || obj.virtual;
  if (direct && (direct.accountNumber || direct.account_number)) {
    return {
      bankName: direct.bankName || direct.bank || direct.bank_name,
      accountNumber: String(
        direct.accountNumber || direct.account_number || ""
      ),
      accountName: direct.accountName || direct.account_name,
    };
  }

  const arr = obj.accounts || obj.bankAccounts || obj.bank_accounts || [];
  if (Array.isArray(arr)) {
    const v =
      arr.find(
        (a: any) =>
          (a.type || a.kind || a.accountType || "")
            .toString()
            .toLowerCase()
            .includes("virtual") || a.isVirtual === true
      ) || null;
    if (v) {
      return {
        bankName: v.bankName || v.bank || v.bank_name,
        accountNumber: String(v.accountNumber || v.account_number || ""),
        accountName: v.accountName || v.account_name,
      };
    }
  }

  const num =
    obj.virtualAccountNumber ||
    obj.virtual_account_number ||
    obj.vAccountNumber ||
    obj.accountNumber;
  if (num) {
    return {
      bankName:
        obj.virtualBankName ||
        obj.bankName ||
        obj.bank ||
        obj.virtual_bank_name,
      accountNumber: String(num),
      accountName:
        obj.virtualAccountName || obj.accountName || obj.account_name,
    };
  }

  return null;
}

/** Parse tier-2 indicator from flexible shapes (same idea as dashboard) */
function pickIsTier2(obj: any): boolean {
  const level =
    obj.tier || obj.level || obj.accountLevel || obj.kycLevel || obj.kyc;
  if (typeof level === "number") return level >= 2;
  if (typeof level === "string") {
    const n = parseInt(level.replace(/\D/g, "") || "0", 10);
    if (Number.isFinite(n)) return n >= 2;
    return /tier\s*2|level\s*2|kyc\s*2/i.test(level);
  }
  return !!(
    obj.isTier2 ||
    obj.tier2 ||
    obj.hasVirtualAccount ||
    obj.virtualAccount ||
    obj.virtual_account
  );
}

/** Bank logo with graceful fallback to initials */
function BankLogo({ name, urls }: { name: string; urls: string[] }) {
  const [ix, setIx] = useState(0);
  const initials = (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!urls[ix]) {
    return (
      <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold grid place-items-center">
        {initials || "BN"}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={urls[ix]}
      alt={`${name} logo`}
      className="h-7 w-7 object-contain rounded-sm bg-white"
      onError={() => setIx((p) => (p + 1 < urls.length ? p + 1 : p))}
    />
  );
}

/* ---------------- page ---------------- */
export default function CreditRechargePage() {
  const router = useRouter();

  const [currentBalance, setCurrentBalance] = useState(0);
  const [amountRaw, setAmountRaw] = useState("400000");
  const amount = useMemo(() => parseNG(amountRaw), [amountRaw]);

  // Tier / Virtual account (from /api/user/me)
  const [isTier2, setIsTier2] = useState(false);
  const [virtual, setVirtual] = useState<VirtualAccount | null>(null);

  // Sheets
  const [selectOpen, setSelectOpen] = useState(false); // Tier-1 sheet (banks)
  const [pendingOpen, setPendingOpen] = useState(false); // Tier-1 only
  const [vaOpen, setVaOpen] = useState(false); // Tier-2 sheet (VA details)

  const [loading, setLoading] = useState(false); // submitting state (T1)
  const [error, setError] = useState<string | null>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [banksErr, setBanksErr] = useState<string | null>(null);
  const [bankId, setBankId] = useState<string>(""); // set after load
  const chosen = bankAccounts.find((b) => b.id === bankId) || null;

  /* ---- load current credit balance (DASHBOARD-COMPATIBLE) ---- */
  const loadCreditBalance = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/agent/balances", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text || "{}");
      } catch {}

      if (!r.ok) {
        // fallback to /api/user/me
        try {
          const token = getClientToken();
          const r2 = await fetch("/api/user/me", {
            credentials: "include",
            cache: "no-store",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          if (r2.ok) {
            const u = await r2.json().catch(() => ({}));
            const usr = u?.user || u?.data || u || {};
            setCurrentBalance(
              Number(
                usr.creditBalance ?? usr.balance ?? usr.walletBalance ?? 0
              ) || 0
            );
          }
        } catch {}
        return;
      }

      const d = j?.data || {};
      const credit = Number(d.rechargeBalance ?? d.creditBalance ?? 0) || 0;
      setCurrentBalance(credit);
    } catch {
      /* ignore — non-blocking */
    }
  }, []);

  // Load user → determine Tier & virtual account
  const loadUserTierAndVirtual = useCallback(async () => {
    try {
      const token = getClientToken();
      const r = await fetch("/api/user/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const text = await r.text();
      let j: any = {};
      try {
        j = JSON.parse(text || "{}");
      } catch {}

      const user = j?.user || j?.data || j || {};
      setIsTier2(pickIsTier2(user));
      setVirtual(pickVirtualAccount(user));
    } catch {
      // leave defaults
    }
  }, []);

  // initial load
  useEffect(() => {
    loadUserTierAndVirtual();
    loadCreditBalance();
  }, [loadUserTierAndVirtual, loadCreditBalance]);

  // refresh hooks like dashboard (focus / visibility)
  useEffect(() => {
    const onFocus = () => {
      loadUserTierAndVirtual();
      loadCreditBalance();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        loadUserTierAndVirtual();
        loadCreditBalance();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadUserTierAndVirtual, loadCreditBalance]);

  /* ---- Tier 1: load available bank accounts ---- */
  const fallbackBanks: BankAccount[] = [
    {
      id: "wema",
      name: "WEMA BANK",
      health: "100%",
      logoUrls: [
        "https://nigerianbanks.xyz/logo/wema-bank.png",
        "https://logo.clearbit.com/wemabank.com",
      ],
      accountNumber: "0126461853",
    },
    {
      id: "opay",
      name: "OPAY",
      health: "100%",
      logoUrls: [
        "https://nigerianbanks.xyz/logo/paycom.png",
        "https://logo.clearbit.com/opayweb.com",
      ],
      accountNumber: "7088867396",
    },
    {
      id: "fcmb",
      name: "FCMB",
      health: "100%",
      logoUrls: [
        "https://nigerianbanks.xyz/logo/first-city-monument-bank.png",
        "https://logo.clearbit.com/fcmb.com",
      ],
      accountNumber: "2005987367",
    },
  ];

  async function loadBanks() {
    if (isTier2) {
      // Tier 2: banks are hidden/unused
      setBankAccounts([]);
      setLoadingBanks(false);
      setBanksErr(null);
      return;
    }

    try {
      setLoadingBanks(true);
      setBanksErr(null);

      const token = getClientToken();
      const r = await fetch(`/api/v1/settings/bank-accounts?page=1&limit=30`, {
        credentials: "include",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: "no-store",
      });

      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const data = await r.json().catch(() => ({}));
      const raw =
        data?.data?.recharges || data?.data || data?.bankAccounts || [];

      if (Array.isArray(raw) && raw.length) {
        const accounts: BankAccount[] = raw.map((a: any, i: number) => ({
          id: String(a.id || a._id || `bank_${i}`),
          name: String(a.bankName || a.name || "Unknown Bank"),
          health: a.status === "active" ? "100%" : String(a.health || "100%"),
          logoUrls: [
            a.logo || a.logoUrl,
            a.bankName
              ? `https://nigerianbanks.xyz/logo/${String(a.bankName)
                  .toLowerCase()
                  .replace(/\s+/g, "-")}.png`
              : undefined,
          ].filter(Boolean) as string[],
          accountNumber: String(a.accountNumber || a.account_number || "N/A"),
        }));
        setBankAccounts(accounts);
        setBankId(accounts[0]?.id || "");
      } else {
        setBankAccounts(fallbackBanks);
        setBankId(fallbackBanks[0].id);
      }
    } catch (e: any) {
      setBankAccounts(fallbackBanks);
      setBankId(fallbackBanks[0].id);
      setBanksErr("Using default banks — couldn't load from server.");
    } finally {
      setLoadingBanks(false);
    }
  }

  useEffect(() => {
    loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTier2]); // reload if tier changes

  /* ---- actions ---- */
  const quick = (n: number) => setAmountRaw(String(n));

  const proceedTier1 = () => {
    if (amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (loadingBanks) return;
    setSelectOpen(true);
  };

  const proceedTier2 = () => {
    if (amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    // Show VA popup sheet
    setVaOpen(true);
  };

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }

  // Tier 1 submit (bank transfer → pending workflow)
  const submitRechargeTier1 = async () => {
    if (!amount || amount <= 0) return setError("Please enter a valid amount.");
    if (amount < 100) return setError("Minimum recharge amount is ₦100.");
    if (amount > 1_000_000)
      return setError("Maximum recharge amount is ₦1,000,000.");
    if (!chosen) return setError("Please select a bank.");

    try {
      setLoading(true);
      setError(null);

      const token = getClientToken();
      const r = await fetch("/api/v1/agent/recharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          amount: String(amount), // backend expects string
          selectedBank: chosen.name,
          bankId,
        }),
      });

      if (!r.ok) {
        const text = await r.text();
        try {
          const j = JSON.parse(text);
          throw new Error(
            j?.message ||
              j?.upstream?.message ||
              j?.upstream?.error ||
              `HTTP ${r.status}`
          );
        } catch {
          throw new Error(text || `HTTP ${r.status}`);
        }
      }

      setSelectOpen(false);
      setPendingOpen(true);

      // Keep the balance fresh
      loadCreditBalance();
      try {
        localStorage.setItem("lw_balance_dirty", String(Date.now()));
      } catch {}
    } catch (e: any) {
      setError(e?.message || "Failed to submit recharge request.");
    } finally {
      setLoading(false);
    }
  };

  // Tier 2 confirm → straight to dashboard (no pending)
  const submitRechargeTier2 = () => {
    try {
      localStorage.setItem("lw_balance_dirty", String(Date.now()));
    } catch {}
    router.push("/dash");
  };

  /* ---------------- UI ---------------- */
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
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <button
            onClick={() => {
              loadUserTierAndVirtual();
              loadCreditBalance();
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-black"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Title */}
        <div className="px-4">
          <h1 className="text-xl font-extrabold text-gray-900">
            Credit Recharge
          </h1>
          <p className="text-[12px] text-gray-600 mt-1 mb-4">
            {isTier2
              ? "Transfer to your Virtual Account to top up instantly."
              : "Load credit to serve customers"}
          </p>
        </div>

        {/* Errors */}
        {(error || banksErr) && (
          <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700 font-medium">Heads up</p>
              {error && <p className="text-xs text-red-600">{error}</p>}
              {banksErr && <p className="text-xs text-red-600">{banksErr}</p>}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="px-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Amount to recharge
            </label>
            <input
              value={amountRaw}
              onChange={(e) =>
                setAmountRaw(e.target.value.replace(/[^\d]/g, ""))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="₦0"
              aria-label="Amount to recharge"
            />

            <p className="mt-3 text-[12px]">
              Current credit balance:{" "}
              <span className="font-semibold text-emerald-600">
                {fmt(currentBalance)}
              </span>
            </p>

            {!isTier2 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {[2000, 5000, 10000, 20000].map((n) => (
                  <button
                    key={n}
                    onClick={() => setAmountRaw(String(n))}
                    className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                      parseNG(amountRaw) === n
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    {fmt(n)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Optional inline Tier-2 VA preview */}
        {isTier2 && (
          <div className="px-4 mt-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-[12px] font-semibold text-emerald-800 mb-2">
                Your Virtual Account
              </p>
              <div className="text-[12px] text-emerald-900">
                We’ll show the full details in a popup when you proceed.
              </div>
            </div>
          </div>
        )}

        {/* Tier-based CTA */}
        <div className="px-4 pt-10 pb-6 mt-auto">
          {!isTier2 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-gray-600">
                  {loadingBanks
                    ? "Fetching banks…"
                    : `${bankAccounts.length} bank(s) available`}
                </span>
                <button
                  onClick={loadBanks}
                  className="inline-flex items-center gap-1 text-[12px] text-gray-700 hover:text-black"
                  title="Reload banks"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reload
                </button>
              </div>
              <button
                onClick={proceedTier1}
                disabled={amount <= 0 || loadingBanks}
                className={`w-full h-12 rounded-2xl font-semibold ${
                  amount > 0 && !loadingBanks
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                {loadingBanks ? "Loading banks..." : "Proceed"}
              </button>
            </>
          ) : (
            <button
              onClick={proceedTier2}
              disabled={amount <= 0 || !virtual?.accountNumber}
              className={`w-full h-12 rounded-2xl font-semibold ${
                amount > 0 && virtual?.accountNumber
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Proceed
            </button>
          )}
        </div>
      </div>

      {/* ===== Tier 2 Sheet: Virtual Account (no pending, just Done) ===== */}
      {isTier2 && vaOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setVaOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-4" />
            <p className="text-[12px] text-gray-600 mb-3">
              Transfer the amount below to your Virtual Account.
            </p>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <PlainDetail
                label="AMOUNT TO SEND"
                value={`NGN ${amount.toLocaleString("en-NG")}`}
                canCopy
                onCopy={() => copy(String(amount))}
              />
              <VAItem
                label="ACCOUNT NUMBER"
                value={virtual?.accountNumber || "—"}
                canCopy
                onCopy={() =>
                  virtual?.accountNumber && copy(virtual.accountNumber)
                }
              />
              <PlainDetail label="BANK NAME" value={virtual?.bankName || "—"} />
              <PlainDetail
                label="ACCOUNT NAME"
                value={virtual?.accountName || "—"}
              />
            </div>

            <button
              onClick={submitRechargeTier2}
              disabled={!virtual?.accountNumber}
              className={`mt-5 w-full h-12 rounded-2xl font-semibold ${
                virtual?.accountNumber
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ===== Tier 1 Sheet: Select bank / transfer details ===== */}
      {!isTier2 && selectOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !loading && setSelectOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-4" />
            <p className="text-[12px] text-gray-600 mb-3">
              Proceed to your bank app to complete this transfer.
            </p>

            <p className="text-[12px] font-semibold text-gray-800 mb-2">
              Select from Available Banks
            </p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {bankAccounts.map((b, i) => (
                <label
                  key={b.id}
                  className={`flex items-center justify-between px-3 py-3 bg-white cursor-pointer ${
                    i !== bankAccounts.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="bank"
                      checked={bankId === b.id}
                      onChange={() => setBankId(b.id)}
                      className="accent-black"
                      disabled={loading}
                    />
                    <BankLogo name={b.name} urls={b.logoUrls} />
                    <span className="text-sm font-semibold text-gray-900">
                      {b.name}
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold text-emerald-600">
                    {b.health}
                  </span>
                </label>
              ))}
            </div>

            {/* Transfer details */}
            {chosen && (
              <div className="mt-4 space-y-3">
                <PlainDetail
                  label="AMOUNT TO SEND"
                  value={`NGN ${amount.toLocaleString("en-NG")}`}
                  canCopy
                  onCopy={() => copy(String(amount))}
                />
                <PlainDetail
                  label="ACCOUNT NUMBER"
                  value={chosen.accountNumber}
                  canCopy
                  onCopy={() => copy(chosen.accountNumber)}
                />
                <PlainDetail label="BANK NAME" value={chosen.name} />
                <PlainDetail
                  label="ACCOUNT NAME"
                  value="Little Wheel Tech Ltd"
                />
              </div>
            )}

            <button
              onClick={submitRechargeTier1}
              disabled={loading || !chosen}
              className={`mt-5 w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                loading || !chosen
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-black text-white hover:bg-black/90"
              }`}
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? "Processing..." : "I've sent the money"}
            </button>
          </div>
        </div>
      )}

      {/* ===== Tier 1 Sheet: Transaction Pending ===== */}
      {!isTier2 && pendingOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPendingOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-5" />
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-50 ring-gray-50 grid place-items-center mb-4">
              <Check className="w-10 h-10 text-gray-400" />
            </div>

            <div className="mx-auto mb-2 ml-20 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-amber-50 text-amber-700">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span className="text-[12px] font-semibold">
                Transaction Pending
              </span>
            </div>

            <p className="text-sm text-gray-600 text-center mb-2">
              Your recharge request has been submitted
            </p>
            <p className="text-xs text-gray-500 text-center">
              Please wait for admin approval. You'll be notified once processed.
            </p>

            <button
              onClick={() => router.push("/dash")}
              className="mt-6 w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 2.2s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* ---------------- tiny subcomponents ---------------- */
function PlainDetail({
  label,
  value,
  canCopy,
  onCopy,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="bg-white">
      <p className="text-[11px] font-semibold text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {canCopy && (
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-black text-white px-2.5 py-1 rounded-md active:scale-[0.98]"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
}

function VAItem({
  label,
  value,
  canCopy,
  onCopy,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="bg-white/0">
      <p className="text-[11px] font-semibold text-emerald-700 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-emerald-900">{value}</span>
        {canCopy && (
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-700 text-white px-2.5 py-1 rounded-md active:scale-[0.98]"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
