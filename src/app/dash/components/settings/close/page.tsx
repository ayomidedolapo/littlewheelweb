"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Landmark, CheckCircle2, X } from "lucide-react";

const CLOSE_ACCOUNT_URL = "/api/v1/users/close-account";
type CloseAction = "DE_ACTIVATE" | "DELETE";

/* ---------- tiny spinner + overlay ---------- */
function Spinner({ className = "w-4 h-4 text-black" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
    >
      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl flex items-center gap-3">
        <Spinner className="w-5 h-5" />
        <span className="text-[13px] font-semibold text-gray-900">
          Loading…
        </span>
      </div>
    </div>
  );
}

/* ---------------- Bottom Sheet (edge-to-edge) ---------------- */
function BottomSheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 w-full transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* full-bleed sheet */}
        <div className="w-full rounded-t-2xl bg-white shadow-2xl">
          <div className="relative px-4 pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-200" />
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-2 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
          <div className="px-5 pb-6">
            <h3 className="text-center text-[18px] font-extrabold text-gray-900">
              {title}
            </h3>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Toast (bottom) ----------------- */
function Toast({
  show,
  label,
  kind = "ok",
  onClose,
}: {
  show: boolean;
  label: string;
  kind?: "ok" | "err";
  onClose?: () => void;
}) {
  return (
    <div
      role="status"
      className={`fixed inset-x-0 bottom-4 z-[55] flex justify-center transition
      ${
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div
        className={`mx-4 max-w-md w-full rounded-2xl px-4 py-3 shadow-xl border
        ${
          kind === "ok"
            ? "bg-white border-emerald-200"
            : "bg-white border-red-200"
        }`}
      >
        <div className="flex items-center gap-2">
          {kind === "ok" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <X className="w-5 h-5 text-red-600" />
          )}
          <p className="text-[13px] text-gray-900">{label}</p>
          <button
            className="ml-auto text-[12px] text-gray-500 hover:text-gray-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------- Card Option (full-bleed) ----------------- */
function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  desc,
  role,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  role: "deactivate" | "delete";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center justify-between border-y px-4 py-4 bg-white
      ${selected ? "bg-gray-50" : ""}`}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-3 text-left">
        {/* rounded-full icon pill */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-800">
          {icon}
        </div>
        <div>
          <div className="text-[13px] font-semibold text-gray-900">{title}</div>
          <div className="text-[12px] text-gray-600">{desc}</div>
        </div>
      </div>

      {/* big, easy-to-tap radio on the right */}
      <div
        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0
        ${selected ? "border-black" : "border-gray-300"}`}
        aria-label={`${role} option`}
      >
        <div
          className={`h-3.5 w-3.5 rounded-full ${
            selected ? "bg-black" : "bg-transparent"
          }`}
        />
      </div>
    </button>
  );
}

/* ===================== Page ===================== */
export default function CloseAccountPage() {
  const router = useRouter();
  const [choice, setChoice] = useState<CloseAction | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [toast, setToast] = useState<{
    show: boolean;
    msg: string;
    kind?: "ok" | "err";
  }>({
    show: false,
    msg: "",
    kind: "ok",
  });

  const [isPending, startTransition] = useTransition();
  const goBack = () => router.back();

  const postClose = async (payload: {
    feedback?: string;
    action: CloseAction;
  }) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("lw_token") : null;
    const res = await fetch(CLOSE_ACCOUNT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-lw-auth": token } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(
        (await res.text().catch(() => "")) || `Request failed ${res.status}`
      );
    return res.json().catch(() => ({}));
  };

  const submitAction = () => {
    if (!choice) return;
    startTransition(async () => {
      try {
        await postClose({ action: choice, feedback });
        setSheetOpen(false);
        setToast({
          show: true,
          msg:
            choice === "DELETE"
              ? "Your account is being deleted. Thanks for the feedback."
              : "Account deactivated. You can reactivate anytime.",
          kind: "ok",
        });
        setTimeout(() => router.replace("/agent-login"), 900);
      } catch {
        setToast({
          show: true,
          msg:
            choice === "DELETE"
              ? "Delete failed. Please try again."
              : "Failed to deactivate. Please try again.",
          kind: "err",
        });
      }
    });
  };

  const primaryLabel =
    choice === "DELETE"
      ? "Delete Account"
      : choice === "DE_ACTIVATE"
      ? "Deactivate Account"
      : "Select an option";
  const PrimaryIcon = choice === "DELETE" ? Trash2 : Landmark;

  return (
    <>
      <LoadingOverlay show={isPending} />
      <Toast
        show={toast.show}
        label={toast.msg}
        kind={toast.kind}
        onClose={() => setToast({ ...toast, show: false })}
      />

      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-start justify-center p-0 md:p-4">
        {/* keep center container but allow full-bleed options inside */}
        <div className="w-full max-w-sm bg-white md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 sticky top-0 bg-white/90 backdrop-blur z-10 border-b md:border-0">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="mt-2 text-xl font-extrabold">
              Deactivate or Delete
            </h1>
            <p className="mt-1 text-[12px] text-gray-600">
              Hopping out the Wheel. Please, let us know why you&apos;re closing
              your account
            </p>
          </div>

          {/* Content — edge-to-edge options; give space for sticky footer */}
          <div className="py-2 pb-28">
            <OptionCard
              selected={choice === "DE_ACTIVATE"}
              onSelect={() => setChoice("DE_ACTIVATE")}
              role="deactivate"
              icon={<Landmark className="h-6 w-6" />}
              title="Deactivate Account"
              desc="Temporarily take a break from Little Wheel by deactivating your account"
            />
            <OptionCard
              selected={choice === "DELETE"}
              onSelect={() => setChoice("DELETE")}
              role="delete"
              icon={<Trash2 className="h-6 w-6" />}
              title="Delete Account"
              desc="Leave Little Wheel and permanently delete your profile and history in line with our Privacy Policy."
            />
          </div>

          {/* Sticky bottom footer (full width) */}
          <div
            className="fixed bottom-0 left-0 right-0 z-40"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
          >
            <div className="mx-auto w-full max-w-sm px-4 pb-2">
              <button
                disabled={!choice || isPending}
                onClick={() => setSheetOpen(true)} // OPEN SHEET FOR BOTH OPTIONS
                className={`w-full rounded-2xl h-12 flex items-center justify-center gap-2 text-white
                  ${
                    choice === "DELETE"
                      ? "bg-rose-500 disabled:bg-rose-300"
                      : "bg-gray-900 disabled:bg-gray-400"
                  }`}
              >
                <PrimaryIcon className="w-5 h-5" />
                <span className="font-semibold text-[14px]">
                  {primaryLabel}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom sheet opens for BOTH actions */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={
          choice === "DELETE"
            ? "Tell us why you're leaving"
            : "Before you deactivate"
        }
      >
        <p className="text-center text-[12px] text-gray-600">
          {choice === "DELETE"
            ? "Please, let us know why you’re closing your account"
            : "A short note helps us improve while your account is inactive"}
        </p>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Your feedback helps us improve"
          rows={4}
          className="mt-4 w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-black/20"
        />

        <button
          onClick={submitAction}
          disabled={isPending}
          className={`mt-4 w-full h-12 rounded-2xl text-white font-semibold disabled:opacity-70 ${
            choice === "DELETE" ? "bg-rose-500" : "bg-gray-900"
          }`}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="w-4 h-4 text-white" /> Processing…
            </span>
          ) : choice === "DELETE" ? (
            "Confirm Delete"
          ) : (
            "Confirm Deactivate"
          )}
        </button>
      </BottomSheet>
    </>
  );
}
