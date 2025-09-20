"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  MapPin,
  ChevronDown,
  Building2,
  Globe2,
} from "lucide-react";

const FALLBACK_AFTER_ADDRESS = "/agent-login";

// Nigeria states (unchanged)
const NG_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT (Abuja)",
];

// Example LGAs
const LGA_BY_STATE: Record<string, string[]> = {
  Oyo: [
    "Ibadan North",
    "Ibadan North-East",
    "Ibadan North-West",
    "Ibadan South-East",
    "Ibadan South-West",
    "Akinyele",
    "Egbeda",
    "Lagelu",
    "Ido",
    "Oluyole",
    "Other",
  ],
};

export default function AddressPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const NEXT_STEP_ROUTE = sp.get("next") || FALLBACK_AFTER_ADDRESS;

  // ===== session / token (session-first) =====
  const [signupSessionId, setSignupSessionId] = useState<string>("");
  const [bearerToken, setBearerToken] = useState<string>("");

  useEffect(() => {
    try {
      const fromQs = (sp.get("sessionId") || "").trim();
      const sid = fromQs || localStorage.getItem("lw_signup_session") || "";
      if (fromQs) localStorage.setItem("lw_signup_session", fromQs);

      const lt = localStorage.getItem("lw_token") || "";
      setSignupSessionId(sid);
      setBearerToken(sid ? "" : lt); // if session exists, don't use bearer
    } catch {
      // ignore
    }
  }, [sp]);

  // ===== form fields =====
  const [address, setAddress] = useState("No. 15, University Road, Agbowo,");
  const [stateName, setStateName] = useState("Oyo");
  const [lga, setLga] = useState("Ibadan North");
  const [city, setCity] = useState("Ibadan");
  const [country, setCountry] = useState("Nigeria");

  const [openState, setOpenState] = useState(false);
  const [openLga, setOpenLga] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lgaOptions = useMemo(
    () => LGA_BY_STATE[stateName] ?? ["Other"],
    [stateName]
  );

  useEffect(() => {
    if (stateName === "Oyo") {
      setCity("Ibadan");
      setLga("Ibadan North");
    } else {
      setCity("");
      setLga("");
    }
  }, [stateName]);

  const valid = useMemo(
    () =>
      Boolean(
        address.trim() &&
          stateName.trim() &&
          city.trim() &&
          country.trim() &&
          lga.trim()
      ),
    [address, stateName, city, country, lga]
  );

  const goBack = () => router.back();

  const saveAndContinue = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);

    const payload = {
      country: country.trim(),
      state: stateName.trim(),
      city: city.trim(),
      lga: lga.trim(),
      address: address.trim(),
      ...(signupSessionId ? { sessionId: signupSessionId } : {}), // body sessionId too
    };

    // Prefer session id; only send bearer if no session
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(signupSessionId ? { "x-session-id": signupSessionId } : {}),
      ...(!signupSessionId && bearerToken
        ? { Authorization: `Bearer ${bearerToken}` }
        : {}),
    };

    // Client timeout so failures are visible
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);

    try {
      const res = await fetch("/api/auth/set-user-address", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      });

      const raw = await res.text();
      const json = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          return { message: raw };
        }
      })();

      if (!res.ok || json?.success === false) {
        const msg =
          json?.message ||
          json?.upstream?.message ||
          (res.status === 401
            ? "Session expired or invalid. Please verify your phone again."
            : `Couldn’t save address (HTTP ${res.status}).`);
        setError(String(msg));
        setSaving(false);
        return;
      }

      router.replace(NEXT_STEP_ROUTE);
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Request timed out. Please try again."
          : e?.message || "Network error. Please try again."
      );
      setSaving(false);
    } finally {
      clearTimeout(timer);
    }
  };

  const menuItem =
    "w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <button
            onClick={goBack}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>

        {/* Body */}
        <div className="px-4">
          <h1 className="text-[22px] font-extrabold text-gray-900">
            You are almost done!
          </h1>
          <p className="text-[13px] text-gray-600 mt-1">
            Your address helps us ensure you’re always connected to our
            services.
          </p>

          {/* Address */}
          <label className="block mt-5 text-[13px] font-semibold text-gray-800">
            Address*
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <MapPin className="w-4 h-4 text-gray-900" />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="No. 15, University Road, Agbowo,"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* State */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            State*
          </label>
          <div className="mt-2 relative">
            <button
              type="button"
              onClick={() => {
                setOpenState((s) => !s);
                setOpenLga(false);
              }}
              className="w-full flex items-center justify-between rounded-xl bg-gray-100 px-3 py-3 text-left text-sm text-gray-900"
            >
              <span className="truncate">{stateName || "Select state"}</span>
              <ChevronDown className="w-4 h-4 text-gray-900" />
            </button>
            {openState && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
                {NG_STATES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStateName(s);
                      setOpenState(false);
                    }}
                    className={`${menuItem} ${
                      s === stateName ? "font-semibold" : ""
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* LGA */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Local Government*
          </label>
          <div className="mt-2 relative">
            <button
              type="button"
              onClick={() => {
                setOpenLga((s) => !s);
                setOpenState(false);
              }}
              className="w-full flex items-center justify-between rounded-xl bg-gray-100 px-3 py-3 text-left text-sm text-gray-900"
            >
              <span className="truncate">
                {lga || "Select local government"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-900" />
            </button>
            {openLga && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
                {lgaOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setLga(opt === "Other" ? "" : opt);
                      setOpenLga(false);
                    }}
                    className={`${menuItem} ${
                      opt === lga ? "font-semibold" : ""
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          {lga === "" && (
            <input
              autoFocus
              value={lga}
              onChange={(e) => setLga(e.target.value)}
              placeholder="Type your LGA"
              className="mt-2 w-full rounded-xl bg-gray-100 px-3 py-3 text-sm text-gray-900 outline-none"
            />
          )}

          {/* City */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            City*
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <Building2 className="w-4 h-4 text-gray-900" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ibadan"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Country */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Country*
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <Globe2 className="w-4 h-4 text-gray-900" />
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Nigeria"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          {error && (
            <p
              className="text-[12px] text-red-600 mt-3"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </p>
          )}
        </div>

        {/* Spacer */}
        <div className="mt-auto" />

        {/* Footer / Progress */}
        <div className="px-4">
          <div className="rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-gray-800">Set your Address</span>
              <span className="text-gray-600">5/5</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: "100%" }}
              />
            </div>
          </div>

          <button
            onClick={saveAndContinue}
            disabled={!valid || saving}
            className={`mb-5 w-full h-12 rounded-xl font-semibold text-white transition ${
              !valid || saving
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black hover:bg-black/90"
            }`}
          >
            {saving ? "Saving…" : "Save and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
