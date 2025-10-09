/* app/agent-signup/components/term/page.tsx */
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "../../../../components/loaders/LogoSpinner"; // adjust if needed

function TermsInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const returnTo = sp.get("returnTo") || "";
  const [agreeing, setAgreeing] = useState(false);

  const agree = () => {
    if (agreeing) return;
    setAgreeing(true);

    try {
      localStorage.setItem(
        "lw_terms_accepted",
        JSON.stringify({ at: new Date().toISOString(), version: "1.0" })
      );
    } catch (err) {
      console.warn("Failed to save terms acceptance:", err);
    }

    if (returnTo) router.push(returnTo);
    else router.back();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Header */}
      <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-600 hover:text-slate-900 transition"
        >
          ← Back
        </button>
      </div>

      {/* Title */}
      <div className="px-4">
        <h1 className="text-[18px] font-extrabold">
          Terms of Use – Little Wheel Agent App
        </h1>
        <p className="text-[12px] text-slate-600 mt-1">
          Last updated: 13 Sept 2025
        </p>
      </div>

      {/* Content (scrolls) */}
      <main className="flex-1 relative">
        <div className="px-4 pb-28 pt-3">
          <article className="max-w-[640px] mx-auto">
            {/* ======== REPLACE WITH YOUR CONTENT ======== */}
            <h2 className="text-[14px] font-bold text-blue-600 font-inter">
              Introduction
            </h2>
            <p className="text-[13px] leading-[20px]">
              These Terms of Use (the “Terms”) govern your access to and use of
              the Little Wheel Agent App provided by Little Wheel Tech. Ltd
              (“Little Wheel”, “we”, “us”, or “our”). The Agent App facilitates
              customer onboarding, daily savings deposits, vault creation,
              credit recharge, and related financial operations by approved
              Little Wheel Agents (“you”, “Agent”).
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Eligibility
            </h2>
            <p className="text-[13px] leading-[20px]">
              To act as an Agent: <br />- You must be at least 18 years old and
              legally capable of entering into binding agreements. <br />- You
              must complete all KYC (Know Your Customer) procedures and be
              approved by Little Wheel. <br />- You must not have been
              previously suspended or disqualified from any Little Wheel
              service.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Account Registration and Agent Responsibility
            </h2>
            <p className="text-[13px] leading-[20px]">
              You are responsible for:
              <br />- Keeping your login credentials confidential.
              <br />- All activity conducted under your Agent account.
              <br />- Using the App solely in accordance with Little Wheel’s
              policies and procedures.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Agent Obligations and Conduct
            </h2>
            <p className="text-[13px] leading-[20px]">
              - Properly onboard customers and open savings vaults according to
              customer instructions.
              <br />- Accurately collect and record cash savings on behalf of
              customers.
              <br />- Never retain customer funds or delay transaction entries.
            </p>
            <p className="text-[13px] leading-[20px] mt-4">
              IMPORTANT NOTICE: <br /> Legal action will be taken against any
              Agent who accepts cash savings from customers and fails to credit
              the respective customer vaults. Agents are prohibited from
              collecting any amount from customers before or after handling
              their withdrawal, as all applicable deductions are already managed
              by the system. Violations will result in immediate suspension and
              prosecution under Nigerian law.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Wallet and Credit Recharge
            </h2>
            <p className="text-[13px] leading-[20px]">
              Agents must pre-load funds into their credit wallet to transact.
              Key terms include:
              <br />- All credit recharges must be made to the official Little
              Wheel bank accounts listed in the app.
              <br />- Transfers are verified manually by the admin team before
              being credited.
              <br />- Mistaken or fraudulent recharges are non-refundable unless
              otherwise approved by Little Wheel.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Customer Onboarding and Savings Management
            </h2>
            <p className="text-[13px] leading-[20px]">
              When creating vaults:
              <br />- You must confirm the customer&apos;s desired start date.
              <br />- Vaults may start retroactively or from the current date,
              but monthly vaults always conclude at month-end.
              <br />- System service charges are applied automatically at
              withdrawal.
            </p>
            <p className="text-[13px] leading-[20px] mt-4">
              Any misrepresentation or manipulation of vault information
              constitutes fraud and will lead to sanctions
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Commission and Leaderboard
            </h2>
            <p className="text-[13px] leading-[20px]">
              Agents earn commissions based on:
              <br />- New customer onboarding
              <br />- Volume of daily savings deposits
              <br />- Credit recharge value
              <br />- Total saved amount
            </p>
            <p className="text-[13px] leading-[20px] mt-4">
              Commission percentages and leaderboard ranks are updated
              periodically and are subject to Little Wheel&apos;s discretion.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Data Privacy
            </h2>
            <p className="text-[13px] leading-[20px]">
              Agents must:
              <br />- Only collect data through the Agent App.
              <br />- Not store, retain, or share customer information outside
              of the platform.
              <br />- Immediately report any suspected data breach or suspicious
              activity.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Termination or Suspension
            </h2>
            <p className="text-[13px] leading-[20px]">
              Your access to the Agent App may be suspended or terminated if:
              <br />- You violate any part of these Terms.
              <br />- You misuse customer funds or data.
              <br />- Your activities damage the reputation or integrity of
              Little Wheel.
            </p>
            <p className="text-[13px] leading-[20px] mt-4">
              Upon termination, you must cease use of all related Little Wheel
              resources
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Dispute Resolution
            </h2>
            <p className="text-[13px] leading-[20px]">
              Disputes shall be:
              <br />- Initially resolved internally through mediation.
              <br />- If unresolved, referred to arbitration in accordance with
              the laws of the Federal Republic of Nigeria.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Indemnity
            </h2>
            <p className="text-[13px] leading-[20px]">
              You agree to indemnify, defend, and hold harmless Little Wheel,
              its directors, employees, and partners from any claims,
              liabilities, losses, damages, or expenses (including legal fees)
              arising out of:
              <br />- Your misuse of the Agent App
              <br />- Your breach of these Terms
              <br />- Any claim or action brought by a third party due to your
              actions or inactions in the course of your Agent duties
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Limitation of Liability
            </h2>
            <p className="text-[13px] leading-[20px]">
              - Properly onboard customers and open savings vaults according to
              customer instructions.
              <br />- Accurately collect and record cash savings on behalf of
              customers.
              <br />- Never retain customer funds or delay transaction entries.
            </p>
            <p className="text-[13px] leading-[20px] mt-4">
              Little Wheel&apos;s total liability shall not exceed the amount of
              commission paid to the Agent in the last 30 days before the claim
              arose
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Modifications to Terms
            </h2>
            <p className="text-[13px] leading-[20px]">
              Little Wheel may update these Terms at any time. Notice of
              material changes will be sent via the Agent App or email.
              Continued use of the App after such updates constitutes your
              acceptance.
            </p>

            <h2 className="text-[14px] font-bold text-blue-600 font-inter mt-4">
              Contact Information
            </h2>
            <p className="text-[13px] leading-[20px]">
              Little Wheel Tech. Ltd
              <br />
              Email: support@littlewheel.app
              <br />
              Phone: +234 708 886 7396, +234 803 964 0092
              <br />
              Office Address: Sango Terminal, Sango, Ibadan
            </p>
          </article>
        </div>
        <div className="pointer-events-none absolute bottom-[64px] left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent" />
      </main>

      {/* Sticky footer CTA */}
      <div className="sticky bottom-0 left-0 right-0 bg-white px-4 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] pt-2 border-t">
        <div className="max-w-[640px] mx-auto">
          <button
            onClick={agree}
            disabled={agreeing}
            className={`w-full h-11 rounded-xl font-semibold transition inline-flex items-center justify-center gap-2 ${
              agreeing
                ? "bg-gray-300 text-gray-600"
                : "bg-black text-white hover:bg-black/90"
            }`}
          >
            {agreeing ? (
              <>
                <LogoSpinner show={true} />
                Processing…
              </>
            ) : (
              "Yes, I agree"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TermsAndConditions() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <TermsInner />
    </Suspense>
  );
}
