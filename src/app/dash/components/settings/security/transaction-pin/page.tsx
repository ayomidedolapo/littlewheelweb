"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, HelpCircle, X, Check } from "lucide-react";

const PIN_LEN = 4;

export default function SetTransactionPinPage() {
  const router = useRouter();

  const [stage, setStage] = useState<"enter" | "confirm">("enter");
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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

  function addDigit(d: string) {
    if (submitting) return;
    if (!/^\d$/.test(d)) return;
    if (activeValue.length >= PIN_LEN) return;
    setActiveValue(activeValue + d);
  }

  function backspace() {
    if (submitting) return;
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

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") addDigit(e.key);
      else if (e.key === "Backspace") backspace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue, submitting, stage]);

  // When 4 digits entered
  useEffect(() => {
    if (activeValue.length !== PIN_LEN) return;

    if (stage === "enter") {
      setTimeout(() => {
        setStage("confirm");
        setErrorMsg(null);
      }, 120);
      return;
    }

    if (stage === "confirm") {
      if (confirmPin !== pin) {
        setErrorMsg("PINs do not match. Please try again.");
        setTimeout(() => setConfirmPin(""), 200);
        return;
      }
      submitPin(pin);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue]);

  async function submitPin(finalPin: string) {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      // TODO: replace with your real API call
      await new Promise((r) => setTimeout(r, 1000));

      setShowSuccess(true); // open bottom sheet
      setSubmitting(false);
    } catch {
      setErrorMsg("Network error. Please try again.");
      setSubmitting(false);
      setConfirmPin("");
    }
  }

  // PIN box
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

  // Keypad button
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
      disabled={submitting}
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
            const val = (stage === "enter" ? pin : confirmPin)[i] || "";
            const isActive =
              (stage === "enter" ? pin : confirmPin).length === i;
            return <PinBox key={i} value={val} isActive={isActive} />;
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

        {submitting && (
          <div className="mt-6 text-center text-sm text-gray-600 inline-flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            Setting up your PIN...
          </div>
        )}
      </div>

      {/* Bottom-sheet Success */}
      <div
        className={`fixed inset-0 z-50 ${
          showSuccess ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!showSuccess}
      >
        {/* Dim backdrop */}
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            showSuccess ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowSuccess(false)}
        />
        {/* Sheet */}
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
              You&apos;ve successfully set your Transaction Pin.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                router.push("/dash"); // <-- route to /dash
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
