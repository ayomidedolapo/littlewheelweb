/* app/agent-signup/components/profile-details/page.tsx */
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, ChevronDown } from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export default function ProfileDetailsPage() {
  const router = useRouter();

  const [middleName, setMiddleName] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const formValid = useMemo(() => {
    return !!dob && address.trim().length > 0 && city.trim().length > 0;
  }, [dob, address, city]);

  const goBack = () => router.back();

  const goBioVerify = () => {
    if (sending) return;
    router.push("/agent-signup/components/bio-verify");
  };

  const handleSubmit = async () => {
    if (!formValid || sending) return;
    setSending(true);
    setErr(null);

    try {
      // Hook your backend here when ready
      // await fetch("/api/auth/profile-details", { ... })

      setSending(false);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong. Please try again.");
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
      <LogoSpinner show={sending} />

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        {/* Top header image */}
        <div className="relative h-[150px] overflow-hidden">
          <Image
            src="/uploads/Sign up - EMPTY.png"
            alt="Header background"
            fill
            priority
            className="object-cover"
          />

          {/* Back */}
          <div className="relative px-4 pt-5">
            <button
              onClick={goBack}
              disabled={sending}
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/95 hover:text-white disabled:text-white/60"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 bg-white/5">
                <ArrowLeft className="h-4 w-4" />
              </span>
              Back
            </button>
          </div>
        </div>

        {/* Avatar overlapping */}
        <div className="relative px-4">
          <div className="-mt-10 w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border border-gray-100">
            <Image
              src="/uploads/avatercust.png"
              alt="Avatar"
              width={64}
              height={64}
              priority
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <div className="mt-3">
            <h1 className="text-[20px] font-extrabold text-gray-900">
              Complete Your Profile
            </h1>
            <p className="text-[13px] text-gray-600 mt-1 leading-snug">
              Enter your phone number to get rolling with Little Wheel
            </p>
          </div>

          {err && (
            <div
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800"
              role="alert"
              aria-live="assertive"
            >
              {err}
            </div>
          )}

          {/* Middle name */}
          <div className="mt-6">
            <label className="block text-[12px] font-bold text-gray-800">
              Middle name (optional)
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
              <User className="h-4 w-4 text-gray-500" />
              <input
                value={middleName}
                onChange={(e) => !sending && setMiddleName(e.target.value)}
                placeholder="e.g John"
                className="flex-1 bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
                disabled={sending}
              />
            </div>
          </div>

          {/* Gender */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Gender<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative rounded-xl bg-gray-100 px-3 py-3">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                disabled={sending}
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 appearance-none pr-8 disabled:cursor-not-allowed"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
              <ChevronDown className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* DOB */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Date of Birth<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative rounded-xl bg-gray-100 px-3 py-3">
              <input
                type="date"
                max={todayISO()}
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                disabled={sending}
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 disabled:cursor-not-allowed
                  [appearance:none] [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <svg
                className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M7 3v2M17 3v2M4 7h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M6 5h12a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Address */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              Address<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 rounded-xl bg-gray-100 px-3 py-3">
              <input
                value={address}
                onChange={(e) => !sending && setAddress(e.target.value)}
                placeholder="2, Samuel Olaboboye Estate"
                disabled={sending}
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 placeholder-gray-400 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* City */}
          <div className="mt-4">
            <label className="block text-[12px] font-bold text-gray-800">
              City<span className="text-red-500">*</span>
            </label>
            <div className="mt-2 relative rounded-xl bg-gray-100 px-3 py-3">
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={sending}
                className="w-full bg-transparent outline-none text-[13px] text-gray-900 appearance-none pr-8 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  Select city
                </option>
                <option value="Osun">Osun</option>
                <option value="Lagos">Lagos</option>
                <option value="Oyo">Oyo</option>
                <option value="Abuja">Abuja</option>
              </select>
              <ChevronDown className="h-4 w-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Button */}
          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={!formValid || sending}
              className={`w-full h-12 rounded-xl text-[14px] font-semibold transition ${
                formValid && !sending
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {sending ? "Submitting…" : "Submit"}
            </button>
          </div>

          {/* Next step link */}
          <div className="mt-5 mb-8 text-center text-[12px] text-gray-600">
            Next step:{" "}
            <button
              onClick={goBioVerify}
              disabled={sending}
              className="font-bold text-gray-900 underline underline-offset-2 disabled:text-gray-400"
            >
              Liveness check
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}