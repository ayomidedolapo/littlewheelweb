"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  Eye,
  EyeOff,
  ArrowDownCircle,
  ArrowUpRight,
  X,
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

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

type Tx = {
  id?: string | number;
  note?: string;
  type?: "deposit" | "withdraw";
  amount?: number; // + for deposit, - for withdraw (we'll fall back if not provided)
  at?: string; // date string
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
};

export default function MobileDashboard() {
  const router = useRouter();

  const [creditBalance, setCreditBalance] = useState(0.0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  // Bottom-sheet for all transactions
  const [showAllTx, setShowAllTx] = useState(false);

  // ✅ Fetch user from the correct API endpoint
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching user profile from /api/user/me...");

        const res = await fetch("/api/user/me", {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        console.log("User profile response status:", res.status);

        if (!res.ok) {
          if (res.status === 401) {
            // Unauthorized - redirect to login
            console.log("User not authenticated, redirecting to login...");
            router.replace(LOGIN_ROUTE);
            return;
          }

          const errorData = await res
            .json()
            .catch(() => ({ message: "Failed to load profile" }));
          throw new Error(errorData.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("User profile data:", data);

        // Handle different possible response structures
        const userData = data?.user || data?.data || data;

        if (userData) {
          const userInfo: User = {
            firstName: userData.firstName || userData.first_name,
            lastName: userData.lastName || userData.last_name,
            middleName: userData.middleName || userData.middle_name,
            username: userData.username,
            email: userData.email,
            balance: Number(userData.balance || userData.creditBalance || 0),
            commission: Number(
              userData.commission || userData.totalCommission || 0
            ),
            transactions:
              userData.transactions || userData.recentTransactions || [],
            notifications: userData.notifications || [],
            avatarUrl: userData.avatarUrl || userData.avatar_url,
          };

          setUser(userInfo);
          setCreditBalance(userInfo.balance || 0);
          setNotificationCount(userInfo.notifications?.length || 0);

          console.log("User profile loaded successfully:", {
            name: `${userInfo.firstName} ${userInfo.lastName}`,
            balance: userInfo.balance,
            commission: userInfo.commission,
            transactionsCount: userInfo.transactions?.length || 0,
          });
        } else {
          throw new Error("Invalid user data received");
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load user profile";
        setError(errorMessage);

        // If it's an authentication error, redirect to login
        if (
          errorMessage.includes("401") ||
          errorMessage.includes("Unauthorized")
        ) {
          router.replace(LOGIN_ROUTE);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleToggleBalance = () => setShowBalance(!showBalance);
  const openSettings = () => router.push(SETTINGS_ROUTE);
  const goRecharge = () => router.push(RECHARGE_ROUTE);
  const goWithdraw = () => router.push(WITHDRAW_ROUTE);
  const goNotifications = () => router.push(NOTIFICATIONS_ROUTE);
  const goToFullTransactions = () => router.push(FULL_TRANSACTIONS_ROUTE);

  // Normalize transactions for the bottom sheet
  const txList: Tx[] = useMemo(() => {
    const list = user?.transactions ?? [];
    // If the API doesn't supply positive/negative amounts, we'll infer from type
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

  // Get user display name
  const getUserDisplayName = () => {
    if (!user) return "User";

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const username = user.username || "";

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (username) {
      return username;
    }

    return "User";
  };

  // Handle retry for errors
  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  // If there's an error, show error state
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

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-black px-6 pt-8 pb-6">
          {/* Greeting + Notifications */}
          <div className="flex items-center justify-between mb-6">
            {/* Make the whole profile area clickable */}
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
                  />
                ) : (
                  <div className="w-full h-full bg-gray-400 flex items-center justify-center text-white text-lg font-bold">
                    {getUserDisplayName().charAt(0).toUpperCase()}
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
                    {getUserDisplayName()}
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

          {/* Credit Balance (white card with transparent black grid lines) */}
          <div className="bg-white rounded-md p-6 shadow-sm relative overflow-hidden">
            {/* grid overlay */}
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

            {/* content */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Credit Balance
                  </p>
                  <button
                    onClick={handleToggleBalance}
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
                    {showBalance ? `₦${creditBalance.toFixed(2)}` : "₦••••"}
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
                onSeeAll={goToFullTransactions} // ⬅️ route to full transactions page
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
                total={user?.commission ?? 0}
                withdrawablePct={0.7}
                onWithdraw={goWithdraw} // ⬅️ route to withdraw
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
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAllTx(false)}
            aria-hidden
          />
          {/* sheet */}
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl"
            style={{
              animation: "slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <style jsx>{`
              @keyframes slideUp {
                from {
                  transform: translateY(100%);
                }
                to {
                  transform: translateY(0);
                }
              }
            `}</style>

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
                  onClick={goRecharge}
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
