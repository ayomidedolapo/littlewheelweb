"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, DollarSign, Eye, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import BottomTabs from "../dash/components/BottomTabs";
export default function CustomerPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);

  const onOnboard = () => {
    console.log("Onboard new user clicked");
    // Add your onboard logic here
  };

  // Mock customer data - you can replace this with real data when API is integrated
  const mockCustomers = [
    // {
    //   id: 1,
    //   name: "Kazeem Abiona",
    //   status: "Active",
    //   vaultBalance: "₦50,000",
    //   phoneNumber: "09123456789",
    //   avatar: "K"
    // },
  ];

  // Use empty array for now - will show "no customers" state
  const displayCustomers = customers.length > 0 ? customers : mockCustomers;

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, centered card on desktop */}
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-black mb-4">Customers</h1>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black w-4 h-4" />
            <input
              type="text"
              placeholder="Search by Phone number or name"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white flex-1">
          {/* Filter Header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <span className="text-sm font-bold text-black">All Users</span>
          </div>

          {/* Customer List */}
          <div className="px-6 py-4">
            {displayCustomers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  No customers onboarded yet
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Start onboarding customers to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayCustomers.map((customer) => (
                  <div key={customer.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {customer.avatar}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {customer.name}
                          </h3>
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium mt-1">
                            {customer.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Vault Balance
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          {customer.vaultBalance}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Phone No
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          {customer.phoneNumber}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold flex-1 justify-center">
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Deposit
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex-1 justify-center">
                        <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Check vault
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex-1 justify-center">
                        <ArrowUpRight
                          className="w-3.5 h-3.5"
                          strokeWidth={2.5}
                        />
                        Withdraw
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Tabs */}
          <BottomTabs
            value="customers"
            onChange={(t) => console.log("tab:", t)}
            className="mt-8"
          />
        </div>

        {/* Onboard Button */}
        <div
          className="fixed right-4 z-50 pointer-events-none"
          style={{ top: `calc(env(safe-area-inset-top) + 500px)` }}
        >
          <button
            type="button"
            onClick={() => router.push("./onboard")}
            aria-label="Onboard new user"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
               text-white text-[12px] font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            Onboard new user
          </button>
        </div>
      </div>
    </div>
  );
}
