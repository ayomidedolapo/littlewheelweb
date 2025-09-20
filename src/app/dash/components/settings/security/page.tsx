"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Lock, KeyRound } from "lucide-react";

export default function SecurityPage() {
  const router = useRouter();

  const goBack = () => router.back();
  const goChangePassword = () =>
    router.push("/dash/components/settings/security/change-password");
  const goPin = () =>
    router.push("/dash/components/settings/security/transaction-pin");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-4 py-3">
          <button
            onClick={goBack}
            className="flex items-center text-left"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 mr-2" />
            <span className="text-gray-700 text-base">Back</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-4 pt-4 pb-10">
        <h1 className="text-xl font-semibold text-black mb-4">Security</h1>

        {/* ---- Card: Change Password ---- */}
        <button
          onClick={goChangePassword}
          className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100 px-4 py-4 flex items-center justify-between mb-3 active:scale-[0.995] transition"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Lock className="w-4 h-4 text-gray-700" />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-semibold text-gray-900">
                Change Password
              </p>
              <p className="text-[12px] text-gray-500">
                Update your current password for better security
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>

        {/* ---- Card: Transaction PIN ---- */}
        <button
          onClick={goPin}
          className="w-full bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-gray-100 px-4 py-4 flex items-center justify-between active:scale-[0.995] transition"
        >
          <div className="flex items-center gap-3">
            {/* small circular badge “1” like the mock */}
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-[12px] font-medium text-gray-600">1</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-gray-900">
                Transaction PIN
              </span>
              <KeyRound className="w-4 h-4 text-gray-500 hidden" />
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
