"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Landmark, Lock } from "lucide-react";
import React from "react";

export default function WithdrawalSettingsPage() {
  const router = useRouter();

  const goBack = () => router.back();
  const goBankDetails = () =>
    router.push("/dash/components/settings/bank/details");
  const goWithdrawalPin = () =>
    router.push("/dash/components/settings/withdrawal-pin");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            <span className="text-base">Back</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 pt-4 pb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Withdrawal settings
        </h1>

        <div className="mt-4 space-y-3">
          {/* Card 1: Bank Details */}
          <button
            onClick={goBankDetails}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-4 py-4"
          >
            <div className="flex items-center">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <Landmark className="w-5 h-5 text-gray-700" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Bank Details
                </p>
                <p className="text-[12px] text-gray-500">
                  Add your bank details and enjoy smooth transactions
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
            </div>
          </button>

          {/* Card 2: Change Withdrawal PIN */}
          <button
            onClick={goWithdrawalPin}
            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow px-4 py-4"
          >
            <div className="flex items-center">
              <div className="shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <Lock className="w-5 h-5 text-gray-700" />
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Change Withdrawal PIN
                </p>
                <p className="text-[12px] text-gray-500">
                  Create a 6-digit PIN
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
