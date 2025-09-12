"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MobileVerification() {
  const router = useRouter();

  // 👇 change this to validate against server/API if needed
  const EXPECTED_CODE = "1644"; // matches your mock

  const [code, setCode] = useState<string[]>(["", "", "", ""]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [timeLeft, setTimeLeft] = useState(305); // 5:05 in seconds
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const isComplete = useMemo(() => code.every((d) => d !== ""), [code]);
  const valueAsString = useMemo(() => code.join(""), [code]);

  // countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  // helpers
  const focusIndex = (i: number) => inputsRef.current[i]?.focus();

  const setDigit = (i: number, v: string) => {
    const next = [...code];
    next[i] = v;
    setCode(next);
  };

  const handleChange = (index: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    if (!v) {
      setDigit(index, "");
      return;
    }
    setDigit(index, v);
    if (index < 3) focusIndex(index + 1);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && code[index] === "" && index > 0) {
      e.preventDefault();
      setDigit(index - 1, "");
      focusIndex(index - 1);
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && index > 0) {
      e.preventDefault();
      focusIndex(index - 1);
    }
    if ((e.key === "ArrowRight" || e.key === "ArrowDown") && index < 3) {
      e.preventDefault();
      focusIndex(index + 1);
    }
  };

  // paste support: paste "1234" into any box
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (txt.length) {
      e.preventDefault();
      const next = txt
        .padEnd(4, " ")
        .split("")
        .slice(0, 4)
        .map((c) => (/\d/.test(c) ? c : ""));
      setCode(next);
      focusIndex(Math.min(txt.length, 3));
    }
  };

  const handleSendAgain = () => {
    setTimeLeft(305);
    // TODO: hit your API to resend
    setStatus("idle");
  };

  const handleProceed = () => {
    if (!isComplete) return;
    if (valueAsString === EXPECTED_CODE) {
      setStatus("success");
      // simulate a brief success state then continue
      setTimeout(
        () => router.push("./onboard-form/components/personal-details"),
        150
      );
    } else {
      setStatus("error");
      // shake effect reset
      setTimeout(() => setStatus("idle"), 600);
    }
  };

  const baseBox =
    "w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold rounded-lg border-2 focus:outline-none transition-all duration-150";

  const colorForStatus = (filled: boolean) => {
    if (status === "success")
      return "border-green-500 bg-green-50 text-green-700";
    if (status === "error") return "border-red-500 bg-red-50 text-red-700";
    // default (idle) → BLACK box
    return filled
      ? "border-black text-gray-900"
      : "border-black/70 text-gray-900";
  };

  const proceedEnabled = isComplete;
  const proceedBtn = proceedEnabled
    ? "bg-black text-white hover:bg-black/90"
    : "bg-gray-200 text-gray-500 cursor-not-allowed";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 pt-8 bg-white">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-6 bg-white flex flex-col h-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Verify Mobile Number
          </h1>

          <p className="text-gray-600 text-sm mb-2">
            A verification code has been sent to their mobile number
          </p>

          <div className="mb-2">
            <span className="text-gray-900 font-medium text-sm">
              (+234-913-****-7937).{" "}
            </span>
            <button
              onClick={handleSendAgain}
              className="text-gray-900 text-sm underline hover:text-gray-700"
            >
              Send code again
            </button>
          </div>

          {/* Inputs */}
          <div
            className={`flex justify-center gap-4 my-8 ${
              status === "error" ? "animate-[shake_0.6s_ease]" : ""
            }`}
            // tiny CSS keyframes (Tailwind inline)
            style={{
              // @ts-ignore
              "--tw-translate-x": "0",
            }}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputsRef.current[i] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`${baseBox} ${colorForStatus(
                  !!digit
                )} focus:ring-0 focus:border-black`}
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-center mb-6">
            <span className="text-gray-600 text-sm">
              {formatTime(timeLeft)} left
            </span>
          </div>

          {/* Change number */}
          <button
            onClick={() => router.back()}
            className="flex items-center justify-between w-full py-3 text-gray-700 hover:text-gray-900 mb-8"
          >
            <span className="text-sm font-medium">Or Change phone number</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Proceed */}
          <div className="pb-6 mt-auto">
            <button
              onClick={handleProceed}
              disabled={!proceedEnabled}
              className={`w-full font-semibold py-4 px-6 rounded-xl transition-colors text-sm ${proceedBtn}`}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>

      {/* inline keyframes for shake */}
      <style jsx>{`
        @keyframes shake {
          10% {
            transform: translateX(-4px);
          }
          20% {
            transform: translateX(4px);
          }
          30% {
            transform: translateX(-4px);
          }
          40% {
            transform: translateX(4px);
          }
          50% {
            transform: translateX(-4px);
          }
          60% {
            transform: translateX(4px);
          }
          70% {
            transform: translateX(-2px);
          }
          80% {
            transform: translateX(2px);
          }
          90% {
            transform: translateX(-1px);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
