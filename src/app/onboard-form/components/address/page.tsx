/* app/.../address/page.tsx */
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";

/** Where to go after saving the address */
const NEXT_ROUTE = "/customer";

/** All LGAs that make up Ibadan, Oyo State (11) */
const IBADAN_LGAS = [
  "Ibadan North",
  "Ibadan North-East",
  "Ibadan North-West",
  "Ibadan South-East",
  "Ibadan South-West",
  "Akinyele",
  "Egbeda",
  "Ido",
  "Lagelu",
  "Oluyole",
  "Ona Ara",
];

/** Add a customer id to a persistent local list (no server required) */
function addCustomerIdToList(id: string) {
  if (!id) return;
  try {
    const raw = localStorage.getItem("lw_customer_ids");
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(id)) {
      arr.unshift(id);
      // keep list bounded (optional)
      localStorage.setItem(
        "lw_customer_ids",
        JSON.stringify(arr.slice(0, 100))
      );
    }
  } catch {}
}

/** Pull auth token from storage so requests are not cookie-dependent */
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

export default function AddressPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    address: "",
    lga: "",
    city: "Ibadan",
    state: "Oyo",
    country: "Nigeria",
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isIbadanOyo =
    form.city.trim().toLowerCase() === "ibadan" &&
    form.state.trim().toLowerCase() === "oyo";

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.address.trim()) e.address = "Address is required.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.state.trim()) e.state = "State is required.";
    if (!form.lga.trim()) e.lga = "Select your Local Government.";
    if (form.lga && !isIbadanOyo) {
      e.lga = "Set City to 'Ibadan' and State to 'Oyo' to use Ibadan LGAs.";
    }
    return e;
  }, [form, isIbadanOyo]);

  const isValid = Object.keys(errors).length === 0;

  const onChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value;
      setForm((s) => ({
        ...s,
        [field]: val,
        ...(field === "city" || field === "state"
          ? {
              lga:
                (field === "city" &&
                  (val.trim().toLowerCase() !== "ibadan" ||
                    s.state.trim().toLowerCase() !== "oyo")) ||
                (field === "state" &&
                  (val.trim().toLowerCase() !== "oyo" ||
                    s.city.trim().toLowerCase() !== "ibadan"))
                  ? ""
                  : s.lga,
            }
          : {}),
      }));
    };

  const markTouched = (f: keyof typeof form) =>
    setTouched((t) => ({ ...t, [f]: true }));

  const fieldBox =
    "w-full rounded-lg border border-gray-300 focus:border-black focus:ring-0 placeholder-gray-400 bg-white h-12 px-3 text-sm";
  const labelCls =
    "text-sm font-medium text-gray-800 flex items-center gap-1 mb-2";
  const errorCls = "mt-1 text-xs text-red-600";

  const handleBack = () => router.back();

  async function handleContinue() {
    if (!isValid) {
      setTouched({ address: true, lga: true, city: true, state: true });
      return;
    }

    const token = sessionStorage.getItem("lw_reg_token");
    if (!token) {
      setErrorMsg("Missing registration token. Please restart onboarding.");
      return;
    }

    const auth = getAuthToken();

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/agent/customers/set-address", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth ? { "x-lw-auth": auth } : {}),
        },
        cache: "no-store",
        // credentials: "include", // ← keep disabled unless your proxy needs it
        body: JSON.stringify({
          token,
          country: form.country.trim() || "Nigeria",
          state: form.state.trim(),
          city: form.city.trim(),
          lga: form.lga.trim(),
          address: form.address.trim(),
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Try to capture the customer id from the response, else fall back to the session key.
      const customerIdFromApi =
        json?.data?.customerId || json?.data?.id || json?.customerId || "";
      const lastFromSession = sessionStorage.getItem(
        "lw_onboarding_customer_id"
      );

      const finalId = String(customerIdFromApi || lastFromSession || "");
      if (finalId) {
        // Maintain the session key as before
        sessionStorage.setItem("lw_onboarding_customer_id", finalId);
        // Persist into the local list for the Customers page (no server needed)
        addCustomerIdToList(finalId);
      }

      // ✅ Go to the customer page after success
      router.push(NEXT_ROUTE);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save address.");
    } finally {
      setSubmitting(false);
    }
  }

  // previous steps already done in your flow
  const isPhoneVerified = true;
  const isPersonalDetailsAdded = true;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-3xl bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 md:px-8 pb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            You are almost done!
          </h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">Enter their address</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form */}
            <div className="md:col-span-2 space-y-5">
              {/* Address */}
              <div>
                <label className={labelCls}>
                  Address<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={onChange("address")}
                  onBlur={() => markTouched("address")}
                  placeholder="e.g No 6, Bolanle Str"
                  className={fieldBox}
                />
                {touched.address && errors.address && (
                  <p className={errorCls}>{errors.address}</p>
                )}
              </div>

              {/* Local Government */}
              <div>
                <label className={labelCls}>
                  Local Government<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.lga}
                    onChange={onChange("lga")}
                    onBlur={() => markTouched("lga")}
                    className={`${fieldBox} appearance-none pr-8 cursor-pointer`}
                    disabled={!isIbadanOyo}
                  >
                    <option value="" disabled>
                      {isIbadanOyo
                        ? "Select your Local Government Area"
                        : "Set City to Ibadan & State to Oyo"}
                    </option>
                    {IBADAN_LGAS.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {touched.lga && errors.lga && (
                  <p className={errorCls}>{errors.lga}</p>
                )}
              </div>

              {/* City */}
              <div>
                <label className={labelCls}>
                  City<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={onChange("city")}
                  onBlur={() => markTouched("city")}
                  placeholder="e.g. Ibadan"
                  className={fieldBox}
                  list="city-suggestions"
                />
                <datalist id="city-suggestions">
                  <option value="Ibadan" />
                </datalist>
                {touched.city && errors.city && (
                  <p className={errorCls}>{errors.city}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className={labelCls}>
                  State<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.state}
                  onChange={onChange("state")}
                  onBlur={() => markTouched("state")}
                  placeholder="e.g. Oyo"
                  className={fieldBox}
                  list="state-suggestions"
                />
                <datalist id="state-suggestions">
                  <option value="Oyo" />
                </datalist>
                {touched.state && errors.state && (
                  <p className={errorCls}>{errors.state}</p>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Steps */}
            <aside className="md:col-span-1">
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
                      Phone Verification
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isPersonalDetailsAdded ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Add Personal Details
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isValid ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span
                      className={`text-sm ${
                        isValid ? "text-gray-700 font-medium" : "text-gray-600"
                      }`}
                    >
                      Add User Address
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Face Capturing
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <button
              onClick={handleContinue}
              disabled={!isValid || submitting}
              className={`w-full md:w-auto px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${
                isValid && !submitting
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {submitting ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
