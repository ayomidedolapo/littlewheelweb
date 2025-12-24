"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function WelcomeKycIntro() {
  const router = useRouter();
  const [agree, setAgree] = useState(false);

  // NEW: read first name saved during Personal Details step
  const [firstName, setFirstName] = useState<string>("");
  useEffect(() => {
    try {
      const name =
        sessionStorage.getItem("lw_first_name") ||
        localStorage.getItem("lw_first_name") ||
        "";
      setFirstName((name || "").trim());
    } catch {
      setFirstName("");
    }
  }, []);

  // 🔒 Make sure the heading stays in 2 lines max
  const rawName = firstName || "Agent";
  const firstOnly = (rawName.split(" ")[0] || "Agent").trim();
  const displayName =
    firstOnly.length > 14 ? firstOnly.slice(0, 14) + "…" : firstOnly;

  const start = () => {
    if (!agree) return;
    router.push("/agent-login");
  };

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* Main column → top content + bottom consent fixed with flex */}
      <div className="mx-auto w-full max-w-[360px] px-5 pb-6 pt-[calc(env(safe-area-inset-top,0px)+160px)] flex flex-col min-h-screen">
        {/* TOP: Logo + heading + intro copy */}
        <div className="text-center">
          {/* Center logo */}
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/uploads/Layer_x0020_1 (2).png"
              alt="Little Wheel logo"
              width={100}
              height={100}
              priority
              className="w-[84px] h-[84px] object-contain filter invert contrast-125"
            />
          </div>

          {/* Heading – forced to 2 lines */}
          <h1 className="font-extrabold text-[18px] leading-[24px] tracking-[0.2px]">
            Welcome Agent {displayName} – Start your
            <br />
            savings journey with Little
          </h1>

          {/* Subcopy */}
          <p className="mt-3 text-[12px] leading-[18px] text-white/90 px-1">
            We’re thrilled that you have joined us! For you to enjoy our
            services, we need to carry out an important activity. The KYC will
            help us to establish the following:
          </p>
        </div>

        {/* BOTTOM: Terms + CTA pinned to bottom */}
        <div className="mt-auto">
          {/* Consent */}
          <div className="mt-7 flex items-start gap-3 text-left">
            <input
              id="agree"
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent accent-white"
            />
            <label htmlFor="agree" className="text-[12px] leading-[18px]">
              By Proceeding, you&apos;ve agreed to accept our{" "}
              <a
                href="/agent-signup/components/term"
                className="underline underline-offset-2"
              >
                Terms and Conditions
              </a>{" "}
              and{" "}
              <a
                href="/agent-signup/components/privacy"
                className="underline underline-offset-2"
              >
                Privacy policy
              </a>
              .
            </label>
          </div>

          {/* CTA */}
          <button
            onClick={start}
            disabled={!agree}
            className={`mt-5 w-full h-12 rounded-xl font-semibold transition ${
              agree
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/20 text-white/70 cursor-not-allowed"
            }`}
          >
            Let’s get Started…
          </button>
        </div>
      </div>
    </div>
  );
}
