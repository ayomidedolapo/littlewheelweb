/* app/dash/page.tsx */
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  balance?: number; // (fallback only)
  commission?: number; // (fallback only)
  transactions?: Tx[];
  notifications?: any[];
  avatarUrl?: string;
  // derived
  isTier2?: boolean;
  virtual?: VirtualAccount | null;
};

export default function MobileDashboard() {
  const router = useRouter();

  const [creditBalance, setCreditBalance] = useState(0.0);
  const [commissionTotal, setCommissionTotal] = useState(0.0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // Copy feedback for VA number
  const [copied, setCopied] = useState(false);

  // Bottom-sheet for all transactions
  const [showAllTx, setShowAllTx] = useState(false);

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

  /** Parse virtual account from flexible shapes */
  function pickVirtualAccount(obj: any): VirtualAccount | null {
    if (!obj) return null;

    // Common shapes
    const direct =
      obj.virtualAccount ||
      obj.virtual_account ||
      obj.virtual ||
      obj.VirtualAccount; // <= handle capitalized key

    if (direct && (direct.accountNumber || direct.account_number)) {
      return {
        bankName: direct.bankName || direct.bank || direct.bank_name,
        accountNumber: String(
          direct.accountNumber || direct.account_number || ""
        ),
        accountName: direct.accountName || direct.account_name,
      };
    }

    // Accounts array with a "virtual" type
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

    // Scattered keys
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

  /** Parse tier-2 indicator from flexible shapes (adds accountTier support) */
  function pickIsTier2(obj: any): boolean {
    if (!obj) return false;

    // Explicit enums/strings the backend may send
    const accountTier = (obj.accountTier || obj.account_tier || "").toString();
    if (/^TIER[_\s-]*2$/i.test(accountTier)) return true;

    // Numeric or string levels
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

    // Boolean hints/flags
    return !!(
      obj.isTier2 ||
      obj.tier2 ||
      obj.hasVirtualAccount ||
      obj.virtualAccount ||
      obj.VirtualAccount
    );
  }

  const fetchUser = useCallback(async () => {
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
          router.replace(LOGIN_ROUTE);
          return;
        }
        const errorData = await res
          .json()
          .catch(() => ({ message: "Failed to load profile" }));
        throw new Error(
          errorData?.message ||
            (res.status === 404
              ? "User endpoint not found"
              : `HTTP ${res.status}`)
        );
      }

      const data = await res.json();
      const userData = data?.user || data?.data || data;
      if (!userData) throw new Error("Invalid user data received");

      const rawAvatar =
        userData.avatarUrl || userData.avatar_url || userData.avatar || "";
      const avatarUrl = normalizeImgSrc(rawAvatar);

      const virtual = pickVirtualAccount(userData);
      const isTier2 = pickIsTier2(userData);

      const userInfo: User = {
        firstName: userData.firstName || userData.first_name,
        lastName: userData.lastName || userData.last_name,
        middleName: userData.middleName || userData.middle_name,
        username: userData.username,
        email: userData.email,
        // Fallback values (balances endpoint is the source of truth)
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

      // (Optional) cache lightweight profile for other pages
      try {
        localStorage.setItem(
          "lw_profile",
          JSON.stringify({
            avatarUrl: userInfo.avatarUrl || "",
            displayName: getDisplayName(userInfo),
            username: userInfo.username || "",
            email: userInfo.email || "",
            isTier2: !!userInfo.isTier2,
            vaAccountNumber: userInfo.virtual?.accountNumber || "",
            vaBankName: userInfo.virtual?.bankName || "",
          })
        );
      } catch {}

      setUser(userInfo);
      setNotificationCount(userInfo.notifications?.length || 0);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load user profile";
      setError(msg);
      if (msg.toLowerCase().includes("unauthorized") || msg.includes("401")) {
        router.replace(LOGIN_ROUTE);
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  /** Authoritative balances (credit + commission) from /api/v1/agent/balances */
  const fetchBalances = useCallback(async () => {
    const toNum = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    try {
      const res = await fetch("/api/v1/agent/balances", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const text = await res.text();
      let j: any = {};
      try {
        j = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        // fall back to user object values if available
        if (typeof user?.balance === "number" && isFinite(user.balance)) {
          setCreditBalance(user.balance);
        }
        if (typeof user?.commission === "number" && isFinite(user.commission)) {
          setCommissionTotal(user.commission);
        }
        return;
      }

      // { data: { rechargeBalance, commissionBalance } }
      const d = j?.data || {};
      const credit = toNum(d.rechargeBalance ?? d.creditBalance);
      const commission = toNum(d.commissionBalance);

      setCreditBalance(credit);
      setCommissionTotal(commission);
    } catch {
      // fallbacks on any error
      if (typeof user?.balance === "number" && isFinite(user.balance)) {
        setCreditBalance(user.balance);
      }
      if (typeof user?.commission === "number" && isFinite(user.commission)) {
        setCommissionTotal(user.commission);
      }
    }
  }, [user?.balance, user?.commission]);

  // Initial load + short poll for fresh balances (helps right after a recharge)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchUser();
      await fetchBalances();
      if (cancelled) return;

      // short 2-minute poll (20s interval)
      const start = Date.now();
      const poll = setInterval(() => {
        if (Date.now() - start > 2 * 60 * 1000) {
          clearInterval(poll);
          return;
        }
        fetchBalances();
      }, 20000);
      return () => clearInterval(poll);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUser, fetchBalances]);

  // Refetch on focus/visibility (no hard reloads)
  useEffect(() => {
    const onFocus = () => {
      fetchUser();
      fetchBalances();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchUser();
        fetchBalances();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchUser, fetchBalances]);

  // Cross-tab signal
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "lw_balance_dirty") fetchBalances();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [fetchBalances]);

  // Keep card in sync if user.balance changes and balances call failed
  useEffect(() => {
    if (typeof user?.balance === "number" && isFinite(user.balance)) {
      setCreditBalance((prev) => (isFinite(prev) ? prev : user.balance));
    }
  }, [user?.balance]);

  const openSettings = () => router.push(SETTINGS_ROUTE);
  const goRecharge = () => router.push(RECHARGE_ROUTE);
  const goWithdraw = () => router.push(WITHDRAW_ROUTE);
  const goNotifications = () => router.push(NOTIFICATIONS_ROUTE);
  const goToFullTransactions = () => router.push(FULL_TRANSACTIONS_ROUTE);

  // Normalize transactions for the bottom sheet
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
    fetchUser();
    fetchBalances();
  };

  if (error && !loading) {
    return (
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
            onClick={() => router.push(LOGIN_ROUTE)}
            className="text-sm text-gray-600 underline"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const displayName = getDisplayName(user);
  const isTier2 = !!user?.isTier2;
  const va = user?.virtual || null;

  return (
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
              className="group flex items-center gap-3 bg-transparent p-0 outline-none cursor-pointer"
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
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
                aria-label="Notifications"
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

            {/* VA strip (shows number if Tier-2 & VA available; otherwise a KYC prompt) */}
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
                      className="group inline-flex items-center gap-2 text-gray-800 hover:text-black"
                      title="Copy account number"
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
                  onClick={() => router.push("/dash/components/kyc")}
                  className="w-full flex items-center justify-between rounded-full bg-amber-100/40 border border-amber-200 px-5 py-1.5 text-amber-900 hover:bg-amber-100/60"
                  title="Upgrade to Tier 2"
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
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={showBalance ? "Hide balance" : "Show balance"}
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
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm"
                disabled={loading}
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
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                    </div>
                  ))}
                </div>
              </div>
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
                onWithdraw={() => router.push(WITHDRAW_ROUTE)}
              />
            )}
          </div>

          <BottomTabs
            value="home"
            onChange={(t) => console.log("tab:", t)}
            className="mt-8"
          />
        </div>
      </div>

      {/* Bottom Sheet: All Recent Transactions */}
      {showAllTx && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAllTx(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-gray-900">
                All Transactions
              </h4>
              <button
                onClick={() => setShowAllTx(false)}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {txList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 mb-2">
                  No transactions yet.
                </p>
                <button
                  onClick={() => router.push(RECHARGE_ROUTE)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Add your first credit
                </button>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto space-y-3 pr-1">
                {txList.map((t) => {
                  const positive = (t.amount ?? 0) > 0;
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between border border-gray-100 rounded-xl px-3 py-3 bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gray-50 flex items-center justify-center ring-1 ring-gray-200">
                          {positive ? (
                            <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-gray-900">
                            {t.note || (positive ? "Deposit" : "Withdraw")}
                          </p>
                          <p className="text-[11px] text-gray-500">{t.at}</p>
                        </div>
                      </div>
                      <div
                        className={`text-[13px] font-semibold ${
                          positive ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {positive ? "+" : "−"}
                        {NGN(Math.abs(t.amount || 0))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
