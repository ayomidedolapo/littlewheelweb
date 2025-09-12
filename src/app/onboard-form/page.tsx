"use client";

import React, { useState } from "react";
import { ArrowLeft, Phone, Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function MobileSignup() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const router = useRouter();

  const handleBack = () => {
    // Navigate back to previous page
    router.back();
  };

  const handleVerify = () => {
    if (isFormValid) {
      // Navigate to verification component
      router.push("./onboard-form/components/verification");
    }
  };

  const isFormValid = phoneNumber.length >= 10;

  // Step completion logic - first step is completed when phone number is valid
  const isPhoneVerified = isFormValid; // This will be true when form is valid

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      {/* Mobile Container - Full screen on mobile, centered card on desktop */}
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header with Back Button */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="px-4 py-6 bg-white">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s Get Started
          </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-sm mb-8">
            Enter their phone number to get things rolling
          </p>

          {/* Mobile Number Section */}
          <div className="mb-8">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Mobile Number
            </label>

            <div className="flex gap-2">
              {/* Country Code with Nigeria Flag */}
              <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3 min-w-fit">
                <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-white">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    alt="Nigeria Flag"
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-gray-700 font-bold text-sm">+234</span>
              </div>

              {/* Phone Number Input */}
              <div className="flex-1">
                <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3">
                  <Phone className="w-4 h-4 text-black mr-2" />
                  <input
                    type="tel"
                    placeholder="000-0000-000"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) {
                        setPhoneNumber(value);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (
                        !/[0-9]/.test(e.key) &&
                        e.key !== "Backspace" &&
                        e.key !== "Delete" &&
                        e.key !== "Tab" &&
                        e.key !== "ArrowLeft" &&
                        e.key !== "ArrowRight"
                      ) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Steps to Onboard New Users */}
          <div className="mb-15 mt-20">
            <h3 className="text-gray-900 font-semibold text-sm mb-4 underline">
              Steps to Onboard New Users
            </h3>

            <div className="space-y-3">
              {/* Step 1 - Verify Phone Number */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    isPhoneVerified ? "bg-green-500" : "bg-gray-400"
                  }`}
                >
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">
                  Verify Phone Number
                </span>
              </div>

              {/* Step 2 - Add Personal Details */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">
                  Add Personal Details
                </span>
              </div>

              {/* Step 3 - Add User Address */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">Add User Address</span>
              </div>

              {/* Step 4 - Face Capturing */}
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">Face Capturing</span>
              </div>
            </div>
          </div>

          {/* Flexible Spacer */}
          <div className="flex-1 min-h-[60px]"></div>

          {/* Verify Button */}
          <div className="pb-6">
            <button
              onClick={handleVerify}
              className={`w-full font-semibold py-4 px-6 rounded-xl transition-colors duration-200 text-sm ${
                isFormValid
                  ? "bg-black hover:bg-gray-500 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!isFormValid}
            >
              Verify
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
