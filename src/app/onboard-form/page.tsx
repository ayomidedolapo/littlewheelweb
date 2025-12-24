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
  const phoneHasError = !isFormValid && phoneNumber.length > 0;

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
      className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center px-0 py-0 md:px-6 md:py-8"
      aria-busy={sending}
    >
      {/* Overlay spinner while sending (if LogoSpinner supports `show`) */}
      <LogoSpinner show={sending} />

      <div
        className="
          w-full 
          bg-white 
          min-h-screen 
          md:min-h-0 
          md:max-w-5xl 
          md:rounded-3xl 
          md:shadow-[0_18px_60px_rgba(15,23,42,0.14)] 
          md:border md:border-gray-100 
          overflow-hidden
          flex flex-col
        "
      >
        {/* Top progress + header */}
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-60"
              disabled={sending}
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              Back
            </button>

            <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-16 rounded-full bg-black" />
              <span className="h-1.5 w-16 rounded-full bg-gray-200" />
              <span className="h-1.5 w-16 rounded-full bg-gray-200" />
              <span className="ml-3 tracking-wide uppercase">
                Step 1 of 3 • Phone number
              </span>
            </div>
          </div>

          <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-black rounded-r-full w-1/3" />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8">
            {/* Left: content + form */}
            <div className="space-y-6">
              {/* Intro */}
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 mb-3">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  Onboarding • Phone verification
                </p>
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
                  Let&apos;s get started
                </h1>
                <p className="text-sm text-gray-600 mt-1.5">
                  Enter the customer&apos;s mobile number to begin their account
                  setup.
                </p>
              </div>

              {/* Error banner (top level) */}
              {error && (
                <div
                  className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                  role="alert"
                >
                  <span className="mt-0.5 text-sm">⚠️</span>
                  <p>{error}</p>
                </div>
              )}

              {/* Phone input card */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 tracking-wide uppercase mb-1.5 block">
                    Mobile number<span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Use the phone number the customer has access to right now.
                  </p>
                </div>

                {/* Combined input: logo + +234 + phone icon + input */}
                <div
                  className={[
                    "flex items-center rounded-xl px-3 py-3 bg-white border transition-all",
                    phoneHasError
                      ? "border-red-500 bg-red-50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100"
                      : "border-gray-200 focus-within:border-gray-900 focus-within:ring-2 focus-within:ring-gray-100",
                  ].join(" ")}
                >
                  {/* Flag + code */}
                  <div className="flex items-center mr-3">
                    <div className="w-5 h-5 rounded-full overflow-hidden mr-2 flex items-center justify-center bg-white">
                      <Image
                        src="https://flagpedia.net/data/flags/w580/ng.png"
                        alt="Nigeria Flag"
                        width={24}
                        height={24}
                        className="w-full h-full"
                      />
                    </div>
                    <span className="text-gray-900 font-semibold text-sm">
                      +234
                    </span>
                  </div>

                  <span className="h-5 w-px bg-gray-300 mr-3 flex-shrink-0" />

                  {/* Phone icon + input */}
                  <Phone className="w-4 h-4 text-black mr-2 flex-shrink-0" />
                  <input
                    type="tel"
                    placeholder="0000000000"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) setPhoneNumber(value);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none text-sm"
                  />
                </div>
                {phoneHasError && (
                  <p className="mt-1 text-[11px] text-red-600">
                    Enter a valid Nigerian mobile number (10–11 digits).
                  </p>
                )}
              </div>
            </div>

            {/* Right: Steps to onboard new users (visible on all screens) */}
            <aside className="mt-6 md:mt-0 md:border-l md:border-gray-100 md:pl-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 underline">
                  Steps to Onboard New Users
                </h3>

                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        isPhoneVerified ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">
                      Verify Phone Number
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">
                      Add Personal Details
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-700 text-sm">
                      Add User Address
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        {/* Bottom: Verify button */}
        <div className="px-4 md:px-8 pb-6 md:pb-8">
          <button
            onClick={handleVerify}
            className={`w-full px-7 py-3.5 rounded-2xl text-sm font-semibold tracking-wide inline-flex items-center justify-center gap-2 transition-all ${
              isFormValid && !sending
                ? "bg-black text-white hover:bg-black/90 shadow-[0_14px_30px_rgba(15,23,42,0.25)]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            disabled={!isFormValid || sending}
            aria-busy={sending}
          >
            {sending ? (
              <>
                <LogoSpinner className="w-4 h-4" />
                Sending…
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
