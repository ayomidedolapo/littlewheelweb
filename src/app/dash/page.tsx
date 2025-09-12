"use client";

import { useState } from "react";
import { Bell, Plus, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import RecentTransactions from "./components/RecentTransactions";
import CommissionSummary from "./components/CommissionSummary";
import BottomTabs from "./components/BottomTabs";

export default function MobileDashboard() {
  const [creditBalance, setCreditBalance] = useState(0.0);
  const [notificationCount, setNotificationCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ name?: string } | null>({ name: "User" });
  const [showBalance, setShowBalance] = useState(true);

  const handleToggleBalance = () => {
    setShowBalance(!showBalance);
  };

  const handleAddCredit = () => {
    // Navigate to add credit page or open modal
    console.log("Add credit clicked");
  };

  const handleNotifications = () => {
    // Navigate to notifications page
    console.log("Notifications clicked");
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, centered card on desktop */}
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-black px-6 pt-8 pb-6">
          {/* Top Bar with Greeting and Notifications */}
          <div className="flex items-center justify-between mb-6">
            {/* User Greeting Section */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full overflow-hidden flex items-center justify-center">
                {/* User Avatar */}
                <Image
                  src="/images/user-avatar.jpg"
                  alt="User Avatar"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Good day!</p>
                {loading ? (
                  <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-md font-bold text-white">
                    {user?.name || "User"}
                  </p>
                )}
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={handleNotifications}
                className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Credit Balance Card */}
          <div className="bg-white rounded-md p-6 shadow-sm  bg-no-repeat">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Credit Balance
                  </p>
                  {/* Balance visibility toggle icon */}
                  <button
                    onClick={handleToggleBalance}
                    className="text-gray-400 hover:text-gray-600"
                    title="Toggle balance visibility"
                  >
                    {showBalance ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xl font-extrabold text-gray-900">
                  {showBalance ? `₦${creditBalance.toFixed(2)}` : "₦••••"}
                </p>
              </div>

              {/* Add Credit Button */}
              <button
                onClick={handleAddCredit}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium text-sm"
              >
                Add Credit
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white flex-1">
          {/* White area content */}
          <div className="px-6 py-6">
            <RecentTransactions
              onSeeAll={() => console.log("See all clicked")}
            />
          </div>

          {/* Full-bleed black section */}
          <div className="-mx-6 p-4">
            <CommissionSummary
              total={60000}
              withdrawablePct={0.7}
              onWithdraw={() => console.log("Withdraw pressed")}
            />
          </div>
          <BottomTabs
            value="home"
            onChange={(t) => console.log("tab:", t)}
            className="mt-8"
          />
        </div>
      </div>
    </div>
  );
}
