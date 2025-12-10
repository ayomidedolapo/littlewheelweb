/* app/.../address/page.tsx */
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Check, AlertCircle } from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

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
    city: "",
    state: "",
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

  const baseField =
    "w-full rounded-xl bg-white h-12 px-3 text-sm outline-none transition-all duration-150 placeholder:text-gray-400";
  const labelCls =
    "text-xs font-medium text-gray-700 flex items-center gap-1 mb-1.5 tracking-wide uppercase";
  const errorCls = "mt-1 text-xs text-red-600";

  const fieldHasError = (field: keyof typeof form) =>
    touched[field] && errors[field];

  const fieldClass = (field: keyof typeof form) => {
    const hasError = fieldHasError(field);
    return [
      baseField,
      hasError
        ? "border border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100",
    ].join(" ");
  };

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
        body: JSON.stringify({
          token,
          // ✅ No more form.country.trim() – just send Nigeria
          country: "Nigeria",
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

      const customerIdFromApi =
        json?.data?.customerId || json?.data?.id || json?.customerId || "";
      const lastFromSession = sessionStorage.getItem(
        "lw_onboarding_customer_id"
      );

      const finalId = String(customerIdFromApi || lastFromSession || "");
      if (finalId) {
        sessionStorage.setItem("lw_onboarding_customer_id", finalId);
        addCustomerIdToList(finalId);
      }

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
  const isUserAddressStep = true; // last step – circle should be green

  const hasTouchedSomething = Object.values(touched).some(Boolean);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center px-0 py-0 md:px-6 md:py-8"
      aria-busy={submitting}
    >
      <LogoSpinner show={submitting} />

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
              disabled={submitting}
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              Back
            </button>

            <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-16 rounded-full bg-green-500" />
              <span className="h-1.5 w-16 rounded-full bg-green-500" />
              <span className="h-1.5 w-16 rounded-full bg-black" />
              <span className="ml-3 tracking-wide uppercase">
                Step 3 of 3 • Address
              </span>
            </div>
          </div>

          <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-black rounded-r-full w-full" />
          </div>
        </div>

        {/* Main layout */}
        <div className="px-4 md:px-8 py-6 md:py-8 grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8 flex-1">
          {/* Left: form */}
          <div className="space-y-6">
            {/* Heading */}
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 mb-3">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                Onboarding • Address details
              </p>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
                Final step – address
              </h1>
              <p className="text-sm text-gray-600 mt-1.5">
                Add the customer&apos;s address so they can be reached easily.
              </p>
            </div>

            {/* Validation summary */}
            {!isValid && hasTouchedSomething && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Some address fields need your attention. Please fix the
                  highlighted inputs.
                </p>
              </div>
            )}

            <div className="space-y-5">
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
                  className={fieldClass("address")}
                  aria-invalid={!!fieldHasError("address")}
                />
                {fieldHasError("address") && (
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
                    className={`${fieldClass(
                      "lga"
                    )} appearance-none pr-9 cursor-pointer ${
                      !isIbadanOyo ? "bg-gray-50 text-gray-400" : ""
                    }`}
                    disabled={!isIbadanOyo}
                    aria-invalid={!!fieldHasError("lga")}
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
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
                </div>
                {fieldHasError("lga") && (
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
                  className={fieldClass("city")}
                  aria-invalid={!!fieldHasError("city")}
                />
                {fieldHasError("city") && (
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
                  className={fieldClass("state")}
                  aria-invalid={!!fieldHasError("state")}
                />
                {fieldHasError("state") && (
                  <p className={errorCls}>{errors.state}</p>
                )}
              </div>

              {/* API error */}
              {errorMsg && (
                <div
                  className="mt-2 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="pt-2 pb-4 md:pb-0">
              <button
                onClick={handleContinue}
                disabled={!isValid || submitting}
                className={`w-full md:w-auto px-7 py-3.5 rounded-2xl text-sm font-semibold tracking-wide inline-flex items-center justify-center gap-2 transition-all ${
                  isValid && !submitting
                    ? "bg-black text-white hover:bg-black/90 shadow-[0_14px_30px_rgba(15,23,42,0.25)]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <LogoSpinner className="w-4 h-4" />
                    Saving address…
                  </>
                ) : (
                  "Save & finish"
                )}
              </button>
            </div>
          </div>

          {/* Right: Steps to onboard new users */}
          <aside className="md:border-l md:border-gray-100 md:pl-6">
            <div className="mt-4 md:mt-10 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-5">
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
                    Phone Verification
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isPersonalDetailsAdded ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    Add Personal Details
                  </span>
                </div>

                {/* Step 3 – always green on this last form */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isUserAddressStep ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
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
    </div>
  );
}
