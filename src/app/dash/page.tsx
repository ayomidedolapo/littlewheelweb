/* app/dash/page.tsx */
"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
} from "react";
import {
  Bell,
  Eye,
  EyeOff,
  ArrowDownCircle,
  ArrowUpRight,
  X,
  Copy,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import RecentTransactions from "./components/RecentTransactions";
import CommissionSummary from "./components/CommissionSummary";
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
  function pickVirtualAccount(obj: any): VirtualAccount | null {
    if (!obj) return null;
    const direct =
      obj.virtualAccount ||
      obj.virtual_account ||
      obj.virtual ||
      obj.VirtualAccount;
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

  return (
    <>
      {/* 🔵 Centered logo spinner (no overlay/backdrop) */}
      <LogoSpinner show={isPending} />

      {/* Error state (no auto-refresh) */}
      {error && !loading ? (
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
            <div className="bg-black px-6 pt-8 pb-6">
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
                  <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center ring-0 group-hover:ring-2 ring-white/30 transition">
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
                  <div className="text-left">
                    <p className="text-sm text-white font-medium opacity-80">
                      Good day!
                    </p>
                    {loading ? (
                      <div className="w-32 h-6 bg-white/20 rounded animate-pulse" />
                    ) : (
                      <p className="text-md font-bold text-white group-hover:underline">
                        {displayName}
                      </p>
                    )}
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

              {/* Credit Balance card */}
              <div className="bg-white rounded-md p-6 shadow-sm relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-md"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(0,0,0,.08) 0, rgba(0,0,0,.08) 1px, transparent 1px, transparent 44px), repeating-linear-gradient(90deg, rgba(0,0,0,.08) 0, rgba(0,0,0,.08) 1px, transparent 1px, transparent 44px)",
                    backgroundSize: "44px 44px, 44px 44px",
                    backgroundPosition: "0 0, 0 0",
                  }}
                />

                {/* VA strip */}
                <div className="relative z-10 mb-3 -mx-1">
                  {isTier2 && va?.accountNumber ? (
                    <div className="relative">
                      <div className="flex items-center justify-between rounded-full bg-gray-100/80 border border-gray-200 px-5 py-1.5">
                        <span className="text-[12px] font-semibold text-gray-800">
                          Your Virtual account
                        </span>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                va.accountNumber!
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1400);
                            } catch {}
                          }}
                          className="group inline-flex items-center gap-2 text-gray-800 hover:text黒 disabled:opacity-60 disabled:cursor-not-allowed"
                          title="Copy account number"
                          disabled={isPending}
                        >
                          <span className="font-mono text-[13px] tracking-wide leading-none">
                            {va.accountNumber}
                          </span>
                          <Copy className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
                        </button>
                      </div>

                      {copied && (
                        <div className="absolute right-3 mt-1 rounded-full bg-black text-white text-[10px] px-2 py-0.5">
                          Copied!
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nav("/dash/components/kyc")}
                      className="w-full flex items中心 justify-between rounded-full bg-amber-100/40 border border-amber-200 px-5 py-1.5 text-amber-900 hover:bg-amber-100/60 disabled:opacity-60 disabled:cursor-not-allowed"
                      title="Upgrade to Tier 2"
                      disabled={isPending}
                    >
                      <span className="text-[12px] font-semibold leading-none">
                        Your Virtual account
                      </span>
                      <span className="text-[12px] font-medium leading-none">
                        {isTier2 ? "Pending setup" : "Upgrade to Tier 2 →"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Balance row + Add credit */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-gray-600 font-medium">
                        Credit Balance
                      </p>
                      <button
                        onClick={() => setShowBalance(!showBalance)}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={
                          showBalance ? "Hide balance" : "Show balance"
                        }
                        disabled={isPending}
                      >
                        {showBalance ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {loading ? (
                      <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      <p className="text-xl font-extrabold text-gray-900">
                        {showBalance ? NGN_FULL(creditBalance) : "₦••••"}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={goRecharge}
                    className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isPending}
                  >
                    Add Credit
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-white flex-1">
              <div className="px-6 py-6">
                {loading ? (
                  <LoadingDetails />
                ) : (
                  <RecentTransactions
                    items={user?.transactions ?? []}
                    onSeeAll={goToFullTransactions}
                  />
                )}
              </div>

              <div className="-mx-6 p-4">
                {loading ? (
                  <div className="bg-gray-50 rounded-lg p-4 mx-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  </div>
                ) : (
                  <CommissionSummary
                    total={commissionTotal}
                    withdrawablePct={0.7}
                    onWithdraw={goWithdraw}
                  />
                )}
              </div>

              <BottomTabs value="home" onChange={() => {}} className="mt-8" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
