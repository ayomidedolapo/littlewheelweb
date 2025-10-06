"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  HelpCircle,
  X,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";

const PIN_LEN = 4;

export default function SetTransactionPinPage() {
  const router = useRouter();

  // main flow
  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // password sheet
  const [pwOpen, setPwOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // success sheet
  const [showSuccess, setShowSuccess] = useState(false);

  const displayTitle = useMemo(
    () =>
      stage === "enter" ? "Set Transaction PIN" : "Confirm Transaction PIN",
    [stage]
  );
  const displayHint = useMemo(
    () =>
      stage === "enter"
        ? "Create a PIN to secure your transaction anytime"
        : "Re-enter the same 4-digit PIN to confirm",
    [stage]
  );

  const activeValue = stage === "enter" ? pin : confirmPin;
  const setActiveValue = stage === "enter" ? setPin : setConfirmPin;

  /* ---------- input helpers ---------- */
  function addDigit(d: string) {
    if (submitting || pwOpen) return;
    if (!/^\d$/.test(d)) return;
    if (activeValue.length >= PIN_LEN) return;
    setActiveValue(activeValue + d);
  }

  function backspace() {
    if (submitting || pwOpen) return;
    if (activeValue.length === 0) return;
    setActiveValue(activeValue.slice(0, -1));
    setErrorMsg(null);
  }

  function goBack() {
    if (stage === "confirm") {
      setStage("enter");
      setConfirmPin("");
      setErrorMsg(null);
    } else {
      router.back();
    }
  }

  // Keyboard support for keypad
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pwOpen) return; // don't type into PIN while password sheet is open
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue, submitting, stage, pwOpen]);

  // When PIN length reaches 4
  useEffect(() => {
    if (activeValue.length !== PIN_LEN) return;

    if (stage === "enter") {
      setTimeout(() => {
        setStage("confirm");
        setErrorMsg(null);
      }, 120);
      return;
    }

    // stage === "confirm"
    if (confirmPin !== pin) {
      setErrorMsg("PINs do not match. Please try again.");
      setTimeout(() => setConfirmPin(""), 200);
      return;
    }

    // open password sheet to collect password before calling API
    setPwOpen(true);
    setPwError(null);
    setPassword("");
  }, [activeValue, stage, confirmPin, pin]);

  /* ---------- submit to backend ---------- */
  async function submitPin(finalPin: string, acctPassword: string) {
    try {
      setSubmitting(true);
      setPwError(null);

      // Optional bearer from client storage (your Auth middleware also reads cookies)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("authToken")
          : null;

      const res = await fetch("/api/v1/settings/set-transaction-pin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          pin: finalPin,
          password: acctPassword,
        }),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        const msg =
          json?.message ||
          json?.error ||
          `Couldn’t set PIN (HTTP ${res.status})`;
        throw new Error(msg);
      }

      // success
      setPwOpen(false);
      setShowSuccess(true);
      setSubmitting(false);
    } catch (err) {
      setSubmitting(false);
      const msg =
        err instanceof Error ? err.message : "Network error. Please try again.";
      setPwError(msg);
    }
  }

  const canConfirmPassword = password.trim().length >= 5 && !submitting;

  /* ---------- UI bits ---------- */
  const PinBox = ({
    value,
    isActive,
  }: {
    value?: string;
    isActive?: boolean;
  }) => (
    <div
      className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl font-medium border-2 transition-all
        ${
          value
            ? "border-gray-800 bg-white text-gray-900"
            : isActive
            ? "border-gray-400 bg-white"
            : "border-gray-200 bg-gray-50"
        }`}
    >
      {value || ""}
    </div>
  );

  const KeypadButton = ({
    children,
    onClick,
    variant = "default",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "delete";
  }) => (
    <button
      onClick={onClick}
      disabled={submitting || pwOpen}
      className={`h-14 w-14 rounded-full flex items-center justify-center font-medium text-lg transition active:scale-95
        ${
          variant === "delete"
            ? "bg-gray-100 text-red-500 hover:bg-gray-200"
            : "bg-gray-100 text-gray-900 hover:bg-gray-200"
        }
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-sm mx-auto px-5 py-4 flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center text-gray-700 hover:text-gray-900"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="text-base font-medium">Back</span>
          </button>
          <HelpCircle className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-5 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            {displayTitle}
          </h1>
          <p className="text-sm text-gray-600">{displayHint}</p>
        </div>

        {/* PIN boxes */}
        <div className="flex justify-center gap-4 mb-2">
          {Array.from({ length: PIN_LEN }).map((_, i) => {
            const v = (stage === "enter" ? pin : confirmPin)[i] || "";
            const isActive =
              (stage === "enter" ? pin : confirmPin).length === i;
            return <PinBox key={i} value={v} isActive={isActive} />;
          })}
        </div>

        {errorMsg && (
          <p className="text-center text-sm text-red-600 mt-2">{errorMsg}</p>
        )}

        {/* Keypad */}
        <div className="mt-16">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="grid grid-cols-3 gap-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <KeypadButton key={d} onClick={() => addDigit(d)}>
                  {d}
                </KeypadButton>
              ))}
              <div />
              <KeypadButton onClick={() => addDigit("0")}>0</KeypadButton>
              <KeypadButton variant="delete" onClick={backspace}>
                <X className="w-5 h-5" />
              </KeypadButton>
            </div>
          </div>
        </div>

        {submitting && !pwOpen && (
          <div className="mt-6 text-center text-sm text-gray-600 inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Saving your PIN…
          </div>
        )}
      </div>

      {/* Bottom-sheet: Ask for Account Password */}
      <div
        className={`fixed inset-0 z-50 ${
          pwOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!pwOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            pwOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !submitting && setPwOpen(false)}
        />
        <div
          className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
            pwOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Confirm with Password
            </h3>
            <p className="text-[13px] text-gray-600 mb-4">
              Enter your account password to finish setting your Transaction
              PIN.
            </p>

            <label className="block text-[12px] text-gray-700 mb-1">
              Account Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canConfirmPassword) {
                    submitPin(pin, password);
                  }
                }}
                className="w-full h-11 rounded-xl border border-gray-200 px-3 pr-10 text-[14px] outline-none"
                placeholder="•••••"
                autoFocus
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {pwError && (
              <div className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{pwError}</span>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => !submitting && setPwOpen(false)}
                className="h-11 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 disabled:opacity-60"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={() => submitPin(pin, password)}
                disabled={!canConfirmPassword}
                className={`h-11 rounded-xl font-semibold text-white ${
                  canConfirmPassword
                    ? "bg-black hover:bg-black/90"
                    : "bg-black/30 cursor-not-allowed"
                }`}
              >
                {submitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-sheet Success */}
      <div
        className={`fixed inset-0 z-50 ${
          showSuccess ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!showSuccess}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            showSuccess ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowSuccess(false)}
        />
        <div
          className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out
                      ${showSuccess ? "translate-y-0" : "translate-y-full"}`}
        >
          <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-8 shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Success
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              You&apos;ve successfully set your Transaction PIN.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                router.push("/dash");
              }}
              className="w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
