"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, HelpCircle, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/* helpers */
const parseNG = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtNG = (n: number) =>
  n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

type Frequency = "daily" | "weekly" | "monthly" | null;
type StartWhen =
  | "start_current_month"
  | "start_today"
  | "start_next_month"
  | null;

export default function CreateSavingsVaultPage() {
  const router = useRouter();
  const sp = useSearchParams();

  /* vault name comes from query (?name=...), with a safe fallback */
  const [vaultName, setVaultName] = useState("Personal Vault");
  useEffect(() => {
    const qn = sp.get("name");
    if (qn && qn.trim()) setVaultName(qn.trim());
  }, [sp]);

  /* form state */
  const [amountRaw, setAmountRaw] = useState("");
  const amount = useMemo(() => parseNG(amountRaw), [amountRaw]);

  const [freq, setFreq] = useState<Frequency>("daily");
  const [justOnce, setJustOnce] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | null>(null);
  const [startWhen, setStartWhen] = useState<StartWhen>("start_today");
  const [lockVault, setLockVault] = useState(false);

  /* success bottom-sheet */
  const [successOpen, setSuccessOpen] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  /* validation */
  const valid = useMemo(() => {
    if (!amount || amount <= 0) return false;
    if (!justOnce && !freq) return false;
    if (!justOnce && !durationMonths) return false;
    if (!startWhen) return false;
    return true;
  }, [amount, justOnce, freq, durationMonths, startWhen]);

  const setQuick = (n: number) => setAmountRaw(String(n));

  function persistDraft() {
    const slug = slugify(vaultName || "personal-vault");
    const draft = {
      id: `v_${Date.now()}`,
      name: vaultName || "Personal Vault",
      slug,
      plan: {
        amount,
        freq: justOnce ? "once" : freq,
        durationMonths: justOnce ? 0 : durationMonths,
        startWhen,
        lock: lockVault,
      },
      createdAt: new Date().toISOString(),
    };
    try {
      const raw = localStorage.getItem("lw_vaults");
      const arr = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(arr) ? arr : [];
      list.unshift(draft);
      localStorage.setItem("lw_vaults", JSON.stringify(list));
    } catch {}
    return slug;
  }

  const createVault = () => {
    if (!valid) return;
    const slug = persistDraft();
    setCreatedSlug(slug);
    setSuccessOpen(true); // show bottom popup
  };

  const viewVault = () => {
    if (!createdSlug) return;
    setSuccessOpen(false);
    router.push(`/customer/vault/${createdSlug}`);
  };

  const pillBase = "h-9 px-3 rounded-md text-sm font-medium transition-colors";
  const segBase = "h-9 px-4 rounded-md text-sm font-semibold transition-colors";
  const chipBase =
    "h-9 px-3 rounded-md text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200";

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </div>

        {/* Title */}
        <div className="px-4">
          <h1 className="text-xl font-extrabold text-gray-900">
            Create Savings Vault
          </h1>
          <p className="text-[12px] text-gray-600 mt-1 mb-4">
            Open a savings vault for your customer
          </p>

          {/* Subtle vault name preview so it’s obvious what route will be used */}
          <div className="mb-4 rounded-md bg-gray-50 border border-gray-100 px-3 py-2">
            <p className="text-[11px] text-gray-500 mb-1">Vault name</p>
            <p className="text-sm font-semibold text-gray-900">{vaultName}</p>
            <p className="text-[11px] text-gray-500 mt-1">
              Will open at:{" "}
              <span className="font-mono">
                /customer/vault/{slugify(vaultName)}
              </span>
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 pb-8 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Amount<span className="text-red-500">*</span>
            </label>
            <input
              value={amountRaw}
              onChange={(e) =>
                setAmountRaw(e.target.value.replace(/[^\d]/g, ""))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter amount"
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {[500, 1000, 2000, 3000].map((n) => {
                const active = amount === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuick(n)}
                    className={`${pillBase} ${
                      active
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    ₦{fmtNG(n)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Frequency<span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {(
                [
                  ["daily", "Daily"],
                  ["weekly", "Weekly"],
                  ["monthly", "Monthly"],
                ] as const
              ).map(([k, label]) => {
                const active = freq === k && !justOnce;
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={justOnce}
                    onClick={() => setFreq(k)}
                    className={`${segBase} ${
                      active
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-800"
                    } ${justOnce ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={justOnce}
                onChange={(e) => {
                  setJustOnce(e.target.checked);
                  if (e.target.checked) setDurationMonths(null);
                }}
                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
              />
              Just once
            </label>
          </div>

          {/* Duration */}
          <div aria-disabled={justOnce}>
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Duration{!justOnce && <span className="text-red-500">*</span>}
            </label>
            <div
              className={`flex flex-wrap gap-2 ${justOnce ? "opacity-50" : ""}`}
            >
              {[
                [1, "1 month"],
                [2, "2 months"],
                [3, "3 months"],
                [6, "6 months"],
                [12, "1 year"],
              ].map(([m, label]) => {
                const active = durationMonths === m && !justOnce;
                return (
                  <button
                    key={m as number}
                    type="button"
                    disabled={justOnce}
                    onClick={() => setDurationMonths(m as number)}
                    className={`${chipBase} ${
                      active ? "ring-2 ring-black" : ""
                    } ${justOnce ? "cursor-not-allowed" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start When */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartWhen("start_current_month")}
                className={`h-10 rounded-md border text-sm ${
                  startWhen === "start_current_month"
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                Start current month
              </button>
              <button
                type="button"
                onClick={() => setStartWhen("start_today")}
                className={`h-10 rounded-md border text-sm ${
                  startWhen === "start_today"
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                Start today
              </button>
              <button
                type="button"
                onClick={() => setStartWhen("start_next_month")}
                className={`col-span-2 h-10 rounded-md border text-sm ${
                  startWhen === "start_next_month"
                    ? "border-black"
                    : "border-gray-200"
                }`}
              >
                Start Next month
              </button>
            </div>
          </div>

          {/* Lock switch */}
          <div className="rounded-xl bg-gray-50 p-4 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                Lock this Vault
              </p>
              <p className="text-[12px] text-gray-600">
                You won&apos;t be able to withdraw from this vault until its
                matured
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLockVault((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition
                ${lockVault ? "bg-black" : "bg-gray-300"}`}
              aria-pressed={lockVault}
              aria-label="Lock this vault"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition
                ${lockVault ? "translate-x-5" : "translate-x-1"}`}
              />
            </button>
          </div>

          {/* CTA */}
          <button
            disabled={!valid}
            onClick={createVault}
            className={`w-full h-12 rounded-xl font-semibold transition
              ${
                valid
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
          >
            Create vault
          </button>
        </div>
      </div>

      {/* SUCCESS BOTTOM SHEET */}
      {successOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSuccessOpen(false)}
            aria-hidden
          />
          {/* sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-200" />
            <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-gray-50 ring-2 ring-gray-50 flex items-center justify-center">
              <Check className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Success
            </h3>
            <p className="text-sm text-gray-600 text-center mt-1">
              You’ve successfully created a new vault for this customer
            </p>
            <button
              onClick={viewVault}
              className="mt-6 w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              View vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
