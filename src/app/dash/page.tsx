/* app/dash/page.tsx */
"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { Bell, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import RecentTransactions from "./components/RecentTransactions";
import CommissionSummary from "./components/Payments";
import BottomTabs from "./components/BottomTabs";

/* ✅ Your existing skeleton for content areas */
import LoadingDetails from "../../components/loaders/LoadingDetails";
/* ✅ New logo spinner (centered, no overlay) */
import LogoSpinner from "../../components/loaders/LogoSpinner";

/* Routes */
const SETTINGS_ROUTE = "/dash/components/settings";
const RECHARGE_ROUTE = "/dash/recharge";
const WITHDRAW_ROUTE = "/dash/withdraw";
const NOTIFICATIONS_ROUTE = "/dash/notifications";
const LOGIN_ROUTE = "/agent-login";
const FULL_TRANSACTIONS_ROUTE = "/dash/fulltransaction";

/* Helpers */
const NGN = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const NGN_FULL = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type Tx = {
  id?: string | number;
  note?: string;
  type?: "deposit" | "withdraw";
  amount?: number;
  at?: string;
};

type VirtualAccount = {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
};
type User = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  username?: string;
  email?: string;
  balance?: number;
  commission?: number;
  transactions?: Tx[];
  notifications?: any[];
  avatarUrl?: string;
  isTier2?: boolean;
  virtual?: VirtualAccount | null;
};

/* ✅ Full page skeleton loader (header + card + buttons + content) */
function DashSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header Section Skeleton */}
        <div className="bg-black px-6 pt-8 pb-3">
          {/* Greeting row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
              <div className="flex flex-col gap-2">
                <div className="h-3 w-16 rounded bg-white/20 animate-pulse" />
                <div className="h-5 w-32 rounded bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
          </div>

          {/* Card skeleton */}
          <div className="bg-white rounded-[10px] p-5 shadow-sm relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[24px]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-7 w-44 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-200 px-4 py-2 animate-pulse">
                <div className="h-5 w-5 bg-gray-300 rounded" />
                <div className="h-3 w-28 bg-gray-300 rounded" />
                <div className="h-3 w-20 bg-gray-300 rounded" />
              </div>

              <div className="mt-5 rounded-lg bg-gray-200 px-2 py-4 animate-pulse" />
            </div>
          </div>

          {/* Buttons skeleton */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-11 rounded-md bg-white/20 animate-pulse" />
            <div className="h-11 rounded-md bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="bg-white flex-1">
          {/* Commission summary skeleton */}
          <div className="-mx-6 pt-0 px-4 pb-4">
            <div className="bg-gray-50 rounded-lg p-4 mx-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          </div>

          {/* Recent transactions skeleton (your existing) */}
          <div className="px-6 py-2">
            <LoadingDetails />
          </div>

          {/* Bottom tabs skeleton */}
          <div className="mt-8 px-6 pb-6">
            <div className="h-14 rounded-2xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const router = useRouter();

  // shows pending during navigation → drives the logo spinner
  const [isPending, startTransition] = useTransition();

  const [creditBalance, setCreditBalance] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [copied, setCopied] = useState(false);

  function isBareBase64Jpeg(s?: string) {
    return !!s && /^\/9j\//.test(s);
  }
  function looksLikeDataUrl(s?: string) {
    return !!s && /^data:image\/[a-z]+;base64,/i.test(s || "");
  }
  function normalizeImgSrc(u?: string) {
    if (!u) return "";
    if (looksLikeDataUrl(u)) return u;
    if (isBareBase64Jpeg(u)) return `data:image/jpeg;base64,${u}`;
    return u;
  }
  function getDisplayName(u?: User | null) {
    if (!u) return "User";
    const firstName = u.firstName || "";
    const lastName = u.lastName || "";
    const username = u.username || "";
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (username) return username;
    return "User";
  }

  /* ---------- FIX ONLY HERE: widen mapping to support { VirtualAccount: { name, number, provider } } ---------- */
  function pickVirtualAccount(obj: any): VirtualAccount | null {
    if (!obj) return null;

    const direct =
      obj.virtualAccount ||
      obj.virtual_account ||
      obj.virtual ||
      obj.VirtualAccount;

    const normalize = (src: any): VirtualAccount | null => {
      if (!src) return null;
      const accountNumber = String(
        src.accountNumber || src.account_number || src.number || ""
      ).trim();
      if (!accountNumber) return null;
      return {
        bankName:
          src.bankName || src.bank || src.bank_name || src.provider || "",
        accountNumber,
        accountName: src.accountName || src.account_name || src.name || "",
      };
    };

    // 1) Direct object
    const d = normalize(direct);
    if (d) return d;

    // 2) Look through arrays
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
      const n = normalize(v);
      if (n) return n;
    }

    // 3) Flat fields on the user
    const num =
      obj.virtualAccountNumber ||
      obj.virtual_account_number ||
      obj.vAccountNumber ||
      obj.accountNumber ||
      obj.number;
    if (num) {
      return {
        bankName:
          obj.virtualBankName ||
          obj.bankName ||
          obj.bank ||
          obj.virtual_bank_name ||
          obj.provider ||
          "",
        accountNumber: String(num).trim(),
        accountName:
          obj.virtualAccountName ||
          obj.accountName ||
          obj.account_name ||
          obj.name ||
          "",
      };
    }

    return null;
  }
  /* ---------- END FIX ---------- */

  function pickIsTier2(obj: any): boolean {
    if (!obj) return false;
    const accountTier = (obj.accountTier || obj.account_tier || "").toString();
    if (/^TIER[_\s-]*2$/i.test(accountTier)) return true;
    const level =
      obj.tier ||
      obj.level ||
      obj.accountLevel ||
      obj.kycLevel ||
      obj.kyc ||
      obj.kyc_level ||
      obj.kycTier;
    if (typeof level === "number") return level >= 2;
    if (typeof level === "string") {
      const n = parseInt(level.replace(/\D/g, "") || "0", 10);
      if (Number.isFinite(n)) return n >= 2;
      if (/tier\s*2|level\s*2|kyc\s*2/i.test(level)) return true;
    }
    return !!(
      obj.isTier2 ||
      obj.tier2 ||
      obj.hasVirtualAccount ||
      obj.virtualAccount ||
      obj.VirtualAccount
    );
  }

  // Initial load (no polling)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/user/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            startTransition(() => router.replace(LOGIN_ROUTE));
            return;
          }
          const errorData = await res
            .json()
            .catch(() => ({ message: "Failed to load profile" }));
          throw new Error(errorData?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const userData = data?.user || data?.data || data;
        if (!userData) throw new Error("Invalid user data");

        const avatarUrl = normalizeImgSrc(
          userData.avatarUrl || userData.avatar_url || userData.avatar || ""
        );
        const virtual = pickVirtualAccount(userData);
        const isTier2 = pickIsTier2(userData);

        const userInfo: User = {
          firstName: userData.firstName || userData.first_name,
          lastName: userData.lastName || userData.last_name,
          middleName: userData.middleName || userData.middle_name,
          username: userData.username,
          email: userData.email,
          balance: Number(
            userData.balance ??
              userData.creditBalance ??
              userData.walletBalance ??
              0
          ),
          commission: Number(
            userData.commission ??
              userData.totalCommission ??
              userData.commissionBalance ??
              0
          ),
          transactions:
            userData.transactions || userData.recentTransactions || [],
          notifications: userData.notifications || [],
          avatarUrl,
          isTier2,
          virtual,
        };

        if (!cancelled) {
          setUser(userInfo);
          setNotificationCount(userInfo.notifications?.length || 0);
        }

        // balances (one-time)
        try {
          const r = await fetch("/api/v1/agent/balances", {
            method: "GET",
            cache: "no-store",
            credentials: "include",
          });
          const t = await r.text();
          let j: any = {};
          try {
            j = JSON.parse(t || "{}");
          } catch {}
          if (r.ok) {
            const d = j?.data || {};
            const credit =
              Number(d.rechargeBalance ?? d.creditBalance ?? 0) || 0;
            const commission = Number(d.commissionBalance ?? 0) || 0;
            if (!cancelled) {
              setCreditBalance(credit);
              setCommissionTotal(commission);
            }
          } else {
            if (!cancelled && Number.isFinite(userInfo.balance))
              setCreditBalance(userInfo.balance!);
            if (!cancelled && Number.isFinite(userInfo.commission))
              setCommissionTotal(userInfo.commission!);
          }
        } catch {
          if (!cancelled && Number.isFinite(userInfo.balance))
            setCreditBalance(userInfo.balance!);
          if (!cancelled && Number.isFinite(userInfo.commission))
            setCommissionTotal(userInfo.commission!);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, startTransition]);

  const displayName = getDisplayName(user);
  const isTier2 = !!user?.isTier2;
  const va = user?.virtual || null;

  // Nav helpers (drive the spinner via isPending)
  const nav = useCallback(
    (href: string) => startTransition(() => router.push(href)),
    [router, startTransition]
  );
  const navReplace = useCallback(
    (href: string) => startTransition(() => router.replace(href)),
    [router, startTransition]
  );

  const openSettings = () => nav(SETTINGS_ROUTE);
  const goRecharge = () => nav(RECHARGE_ROUTE);
  const goWithdraw = () => nav(WITHDRAW_ROUTE);
  const goNotifications = () => nav(NOTIFICATIONS_ROUTE);
  const goToFullTransactions = () => nav(FULL_TRANSACTIONS_ROUTE);

  const txList: Tx[] = useMemo(() => {
    const list = user?.transactions ?? [];
    return list.map((t, i) => {
      let amount = typeof t.amount === "number" ? t.amount : 0;
      if (!amount && t.type === "withdraw") amount = -Math.abs(amount || 0);
      if (!amount && t.type === "deposit") amount = Math.abs(amount || 0);
      return {
        id: t.id ?? i,
        note: t.note ?? (amount >= 0 ? "Deposit" : "Withdraw"),
        type: t.type ?? (amount >= 0 ? "deposit" : "withdraw"),
        amount,
        at:
          t.at ??
          new Date().toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
      };
    });
  }, [user?.transactions]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    navReplace("/dash");
  };

  const handleCopyVa = async () => {
    if (!va?.accountNumber) return;
    try {
      await navigator.clipboard.writeText(va.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore for now
    }
  };

  return (
    <>
      {/* 🔵 Centered logo spinner (no overlay/backdrop) */}
      <LogoSpinner show={isPending} />

      {/* ✅ FULL PAGE SKELETON */}
      {loading && !error ? (
        <DashSkeleton />
      ) : (
        <>
          {/* Error state (no auto-refresh) */}
          {error ? (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white text-center">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm font-medium mb-2">
                    Failed to load dashboard
                  </p>
                  <p className="text-red-600 text-xs mb-3">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
                <button
                  onClick={() => nav(LOGIN_ROUTE)}
                  className="text-sm text-gray-600 underline"
                >
                  Go to Login
                </button>
              </div>
            </div>
          ) : (
            <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
              <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
                {/* Header Section */}
                <div className="bg-black px-6 pt-8 pb-3">
                  {/* Greeting + Notifications */}
                  <div className="flex items-center justify-between mb-6">
                    {/* Profile → Settings */}
                    <button
                      type="button"
                      onClick={openSettings}
                      title="Open settings"
                      className="group flex items-center gap-3 bg-transparent p-0 outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isPending}
                    >
                      {/* UPDATED AVATAR WITH GREY OUTLINE + BLUE VERIFIED TICK */}
                      <div className="relative">
                        {/* Grey outline ring */}
                        <div className="w-10 h-10 rounded-full border border-[#D0D5DD] bg-[#F9FAFB] overflow-hidden flex items-center justify-center">
                          {user?.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt="User avatar"
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Blue tick */}
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-[#2563EB] flex items-center justify-center border-2 border-black">
                          <svg
                            viewBox="0 0 16 16"
                            className="h-2.5 w-2.5 text-white"
                            aria-hidden="true"
                          >
                            <path
                              d="M6.5 10.2 4.3 8l-.9.9 3.1 3.1 5-5-.9-.9z"
                              fill="currentColor"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="text-left">
                        <p className="text-sm text-white font-medium opacity-80">
                          Good day!
                        </p>
                        <p className="text-md font-bold text-white group-hover:underline">
                          {displayName}
                        </p>
                      </div>
                    </button>

                    <div className="relative">
                      <button
                        onClick={goNotifications}
                        className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label="Notifications"
                        disabled={isPending}
                      >
                        <Bell className="w-5 h-5 text-gray-700" />
                        {notificationCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {notificationCount > 99 ? "99+" : notificationCount}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* === NEW CREDIT CARD + COMMISSION + VA (matches design) === */}
                  <div className="bg-white rounded-[10px] p-5 shadow-sm relative overflow-hidden">
                    {/* subtle grid like design */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 rounded-[24px]"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                        backgroundSize: "50px 50px",
                      }}
                    />

                    <div className="relative z-10">
                      {/* Credit Balance */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-[#667185]">
                            Credit Balance
                          </span>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              style={{
                                fontFamily: "Inter",
                                fontWeight: 700,
                                fontSize: "25px",
                                lineHeight: "120%",
                              }}
                              className="text-[#101828]"
                            >
                              {showBalance
                                ? NGN_FULL(creditBalance)
                                : "₦••••"}
                            </span>
                            <button
                              onClick={() => setShowBalance(!showBalance)}
                              className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
                              aria-label={
                                showBalance ? "Hide balance" : "Show balance"
                              }
                              disabled={isPending}
                            >
                              {showBalance ? (
                                <Eye className="w-5 h-5" />
                              ) : (
                                <EyeOff className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Commission Earned pill */}
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#101928] px-4 py-2 text-xs text-white shadow-sm">
                        <span className="inline-flex h-5 w-5 items-center justify-center">
                          <Image
                            src="/uploads/coin-stack.png"
                            alt="Commission icon"
                            width={20}
                            height={20}
                          />
                        </span>
                        <span className="font-medium">Commission Earned:</span>
                        <span className="font-semibold">
                          {NGN_FULL(commissionTotal)}
                        </span>
                      </div>

                      {/* Virtual Account box */}
                      <div className="mt-5 rounded-lg bg-[#E4E7EC] px-2 py-2  text-[#101828]">
                        {isTier2 && va?.accountNumber ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-semibold text-[#667185]">
                                Virtual Account
                              </span>
                              <span className="text-xs font-medium">
                                {va.bankName || "Virtual account"}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyVa}
                              className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#101828] whitespace-nowrap"
                              disabled={isPending}
                            >
                              <span className="font-mono tracking-wide">
                                {va.accountNumber}
                              </span>
                              <Image
                                src="/uploads/copyclip.png"
                                alt="Copy account"
                                width={16}
                                height={16}
                              />
                            </button>
                            {copied && (
                              <span className="absolute right-4 -bottom-5 text-[10px] text-[#667185]">
                                Copied!
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs px-2 font-semibold text-[#1D2739] whitespace-nowrap flex-shrink-0">
                              No virtual account
                            </span>
                            <button
                              type="button"
                              onClick={() => nav("/dash/components/kyc")}
                              className="rounded-lg bg-black px-5 py-2 text-xs font-normal text-white disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                              disabled={isPending}
                            >
                              Open account
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Withdraw / Add credit buttons under card */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={goWithdraw}
                      className="flex items-center justify-center gap-2 rounded-md bg-white  px-4 py-2 text-sm font-semibold text-[#101828] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isPending}
                    >
                      <Image
                        src="/uploads/arrow-down.png"
                        alt="Withdraw"
                        width={20}
                        height={20}
                      />
                      <span>Withdraw</span>
                    </button>

                    <button
                      type="button"
                      onClick={goRecharge}
                      className="flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#101828] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isPending}
                    >
                      <Image
                        src="/uploads/addicon.png"
                        alt="Add credit"
                        className="text-black"
                        width={20}
                        height={20}
                      />
                      <span>Add credit</span>
                    </button>
                  </div>
                </div>

                {/* Main Content */}
                <div className="bg-white flex-1">
                  {/* CommissionSummary — no top space */}
                  <div className="-mx-6 pt-0 px-4 pb-4">
                    <CommissionSummary
                      total={commissionTotal}
                      withdrawablePct={0.7}
                      onWithdraw={goWithdraw}
                    />
                  </div>

                  {/* Recent Transactions */}
                  <div className="px-6 py-2">
                    <RecentTransactions
                      items={user?.transactions ?? []}
                      onSeeAll={goToFullTransactions}
                    />
                  </div>

                  <BottomTabs value="home" onChange={() => {}} className="mt-8" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
