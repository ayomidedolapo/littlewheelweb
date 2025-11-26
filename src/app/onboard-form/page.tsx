/* app/.../mobile-signup/page.tsx */
"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, Phone, Check } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../components/loaders/LogoSpinner";

/* ---------- helpers ---------- */
function toNgE164(localish: string) {
  const d = localish.replace(/\D/g, "");
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `+234${local}`;
}

/** Pull auth token so the request works across devices (not cookie-bound) */
function getAuthToken() {
  try {
    return (
      localStorage.getItem("lw_token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  } catch {
    return "";
  }
}

export default function MobileSignup() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isFormValid = useMemo(() => {
    const d = phoneNumber.replace(/\D/g, "");
    return d.length >= 10 && d.length <= 11;
  }, [phoneNumber]);

  // purely visual tick in the “Steps” list
  const isPhoneVerified = isFormValid;

  const handleBack = () => router.back();

  const handleVerify = async () => {
    if (!isFormValid || sending) return;
    setSending(true);
    setError(null);

    try {
      const e164 = toNgE164(phoneNumber);
      const auth = getAuthToken();

      // Start onboarding (creates registration token)
      const res = await fetch("/api/v1/agent/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { "x-lw-auth": auth } : {}),
        },
        cache: "no-store",
        body: JSON.stringify({
          phoneNumber: e164,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok || json?.success === false) {
        const msg =
          json?.message?.message ||
          json?.message ||
          json?.error ||
          `HTTP ${res.status}`;
        throw new Error(String(msg));
      }

      const regToken =
        json?.data?.token ||
        json?.data?.registrationToken ||
        json?.token ||
        json?.registrationToken ||
        null;

      if (!regToken) {
        throw new Error("Missing registration token.");
      }

      sessionStorage.setItem("lw_reg_token", String(regToken));

      // Proceed to next step
      router.push("./onboard-form/components/verification");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start onboarding.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4"
      aria-busy={sending}
    >
      {/* Centered spinner while sending */}
      <LogoSpinner show={sending} />

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-60"
            disabled={sending}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Main */}
        <div className="px-4 py-6 bg-white">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s Get Started
          </h1>
          <p className="text-gray-600 text-sm mb-8">
            Enter their phone number to get things rolling
          </p>

          {/* Phone input */}
          <div className="mb-8">
            <label className="text-gray-700 font-bold mb-2 block text-sm">
              Mobile Number
            </label>

            <div className="flex gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3 min-w-fit">
                <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-white">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    alt="Nigeria Flag"
                    width={24}
                    height={24}
                    className="w-full h-full"
                  />
                </div>
                <span className="text-gray-700 font-bold text-sm">+234</span>
              </div>

              <div className="flex-1">
                <div className="flex items-center bg-gray-100 rounded-xl px-3 py-3">
                  <Phone className="w-4 h-4 text-black mr-2" />
                  <input
                    type="tel"
                    placeholder="000-0000-000"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) setPhoneNumber(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 bg-transparent text-gray-700 placeholder-gray-400 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Steps */}
          <div className="mb-15 mt-20">
            <h3 className="text-gray-900 font-semibold text-sm mb-4 underline">
              Steps to Onboard New Users
            </h3>

            <div className="space-y-3">
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

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">
                  Add Personal Details
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">Add User Address</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-600 text-sm">Face Capturing</span>
              </div>
            </div>
          </div>

          {/* Verify button */}
          <div className="flex-1 min-h-[60px]" />
          <div className="pb-6">
            <button
              onClick={handleVerify}
              className={`w-full font-semibold py-4 px-6 rounded-xl transition-colors duration-200 text-sm ${
                isFormValid && !sending
                  ? "bg-black hover:bg-black/90 text-white"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!isFormValid || sending}
              aria-busy={sending}
            >
              {sending ? "Sending…" : "Verify"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
