"use client";

import Image from "next/image";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LogoSpinner from "../../components/loaders/LogoSpinner";

// Routes
const CREATE_ACCOUNT_ROUTE = "/agent-signup/components/create";
const LOGIN_ROUTE = "/agent-login";
// ⬇️ Skip should go to Create
const AFTER_SKIP_ROUTE = CREATE_ACCOUNT_ROUTE;

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1>(0);
  const [routing, setRouting] = useState(false);

  const goNext = () => setStep(1);

  const skip = () => {
    if (routing) return;
    setRouting(true);
    router.replace(AFTER_SKIP_ROUTE);
  };

  const createAccount = () => {
    if (routing) return;
    setRouting(true);
    router.push(CREATE_ACCOUNT_ROUTE);
  };

  const login = () => {
    if (routing) return;
    setRouting(true);
    router.push(LOGIN_ROUTE);
  };

  return (
    <div className="min-h-screen bg-white flex items-stretch justify-center">
      <div className="w-full max-w-sm flex flex-col" aria-busy={routing}>
        {/* Top row: progress + Skip / Spinner */}
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-1">
            <span
              className={`h-[3px] w-7 rounded-full ${
                step === 0 ? "bg-black" : "bg-gray-300"
              }`}
            />
            <span
              className={`h-[3px] w-7 rounded-full ${
                step === 1 ? "bg-black" : "bg-gray-300"
              }`}
            />
          </div>

          {routing ? (
            <div className="flex items-center">
              <LogoSpinner show={true} />
            </div>
          ) : (
            <button
              onClick={skip}
              className="text-[12px] text-gray-700 hover:text-gray-900 disabled:opacity-60"
              disabled={routing}
            >
              Skip
            </button>
          )}
        </div>

        {/* Centered logo below the row */}
        <div className="mt-2 flex justify-center">
          <Image
            src="/uploads/Layer_x0020_1 (2).png"
            alt="Little Wheel logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
            priority
          />
        </div>

        {/* Illustration */}
        <div className="px-5 mt-6">
          <div className="relative w-full overflow-hidden rounded-xl mt-10">
            <Image
              src={
                step === 0
                  ? "/uploads/Little wheel onboarding 4 bw 1.png"
                  : "/uploads/Little wheel onboarding 5 bw 1.png"
              }
              alt="Onboarding art"
              width={768}
              height={512}
              priority
              className="w-full h-auto object-contain"
            />
          </div>

          {/* center indicator */}
          <div className="mt-5 flex justify-center">
            <span className="h-1 w-16 rounded-full bg-gray-200 relative overflow-hidden">
              <span
                className={`absolute left-0 top-0 h-full w-1/2 rounded-full transition-transform duration-300 ${
                  step === 0
                    ? "translate-x-0 bg-gray-500"
                    : "translate-x-full bg-gray-500"
                }`}
              />
            </span>
          </div>
        </div>

        {/* Copy */}
        <div className="px-5 pt-6 text-center">
          {step === 0 ? (
            <>
              <h1 className="text-xl font-extrabold text-gray-900 leading-snug">
                Be the plug.
                <br />
                Help People Save and Earn.
              </h1>
              <p className="mt-3 text-[13px] text-gray-600">
                Turn your connections into commission
                <br />
                with Little Wheel.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-gray-900 leading-snug">
                Connect and Cash Out
              </h1>
              <p className="mt-3 text-[13px] text-gray-600">
                Get paid for every smart connection you make
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto px-5 pb-6 pt-6">
          {step === 0 ? (
            <button
              onClick={goNext}
              className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-black/90 active:scale-[0.99] transition"
              disabled={routing}
            >
              Proceed
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={createAccount}
                disabled={routing}
                className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-black/90 active:scale-[0.99] transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {routing ? <LogoSpinner show={true} /> : null}
                Create account
              </button>
              <button
                onClick={login}
                disabled={routing}
                className="w-full h-12 rounded-xl bg-transparent text-gray-900 font-semibold underline underline-offset-2 disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {routing ? <LogoSpinner show={true} /> : null}
                Login your account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
