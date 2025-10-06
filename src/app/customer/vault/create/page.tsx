/* app/customer/vault/create/page.tsx */
"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowLeft, HelpCircle, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

/* ---------- helpers ---------- */
const parseNG = (s: string) => Number((s || "").replace(/[^\d]/g, "")) || 0;
const fmtNG = (n: number) =>
  n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

const monthName = (d = new Date()) =>
  d.toLocaleString("en-US", { month: "long" });

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const makeSafeSlug = (name: string, id: string) => {
  const base = slugify(name || monthName());
  const tail =
    (id || "")
      .toString()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6) || Math.random().toString(36).slice(-6);
  return `${base}-${tail}`;
};

type Frequency = "daily" | "weekly" | "monthly" | null;
type StartWhen =
  | "start_current_month"
  | "start_today"
  | "start_next_month"
  | null;

function getActiveCustomerId(sp: URLSearchParams): string | null {
  const q = sp.get("customerId");
  if (q) return q;
  try {
    return (
      sessionStorage.getItem("lw_active_customer_id") ||
      sessionStorage.getItem("lw_onboarding_customer_id") ||
      null
    );
  } catch {
    return null;
  }
}

function getAuthToken(): string {
  try {
    const m = document.cookie.match(
      /(?:^|;\s*)(authToken|lw_token|token)\s*=\s*([^;]+)/
    );
    if (m?.[2]) return decodeURIComponent(m[2]);
  } catch {}
  try {
    return (
      localStorage.getItem("lw_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

/** yyyy-mm-dd */
function resolveStartDate(when: StartWhen): string {
  const now = new Date();
  if (when === "start_current_month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }
  if (when === "start_next_month") {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/** JS 0..6 -> ISO 1..7 */
const toIsoDow = (js: number) => (js === 0 ? 7 : js);

/* ---------- page ---------- */
export default function CreateSavingsVaultPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }

  // Default the name to the current month (e.g., "October")
  const [vaultName, setVaultName] = useState(monthName());
  useEffect(() => {
    const qn = sp.get("name");
    if (qn && qn.trim()) setVaultName(qn.trim());
  }, [sp]);

  const [amountRaw, setAmountRaw] = useState("");
  const amount = useMemo(() => parseNG(amountRaw), [amountRaw]);

  const [freq, setFreq] = useState<Frequency>("daily");
  const [justOnce, setJustOnce] = useState(false);
  const [durationMonths, setDurationMonths] = useState<number | null>(1);
  const [startWhen, setStartWhen] = useState<StartWhen>("start_today");

  const [successOpen, setSuccessOpen] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [createdVaultId, setCreatedVaultId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(() => {
    if (!amount || amount <= 0) return false;
    if (!startWhen) return false;
    if (!justOnce) {
      if (!freq) return false;
      if (!durationMonths) return false;
    }
    return true;
  }, [amount, justOnce, freq, durationMonths, startWhen]);

  const setQuick = (n: number) => setAmountRaw(String(n));

  async function createVault() {
    if (!valid || submitting) return;

    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setError("Missing customerId.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const startDate = resolveStartDate(startWhen);

      // frequency
      const freqUpper: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY" = justOnce
        ? "ONCE"
        : ((freq || "daily").toUpperCase() as any);

      // duration enum
      const months = justOnce ? 1 : Number(durationMonths || 1);
      const durationMap: Record<number, string> = {
        1: "ONE_MONTH",
        2: "TWO_MONTHS",
        3: "THREE_MONTHS",
        6: "SIX_MONTHS",
        12: "TWELVE_MONTHS",
      };
      const duration = durationMap[months] || "ONE_MONTH";

      // charges for target calc
      const charges =
        freqUpper === "DAILY"
          ? 30 // rough month
          : freqUpper === "WEEKLY"
          ? months * 4
          : freqUpper === "MONTHLY"
          ? months
          : 1; // ONCE

      const targetAmount = Math.max(1, amount * charges);

      // Only add anchors if required by frequency
      const d = new Date(startDate);
      const optional: Record<string, any> = {};
      if (freqUpper === "WEEKLY") optional.dayOfWeek = toIsoDow(d.getDay()); // 1..7
      if (freqUpper === "MONTHLY")
        optional.dayOfMonth = Math.min(Math.max(d.getDate(), 1), 28); // 1..28

      // --- MINIMAL backend payload that worked in Swagger ---
      const body: Record<string, any> = {
        name: vaultName || monthName(),
        amount: String(amount),
        targetAmount: String(targetAmount),
        duration,
        frequency: freqUpper,
        startDate,
        ...optional,
      };

      const res = await fetch(
        `/api/v1/agent/customers/${encodeURIComponent(customerId)}/vaults`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(tokenRef.current
              ? { Authorization: `Bearer ${tokenRef.current}` }
              : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Create failed (${res.status}) ${t}`);
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      const newId =
        data?.data?.id ||
        data?.data?._id ||
        data?.vaultId ||
        data?.id ||
        data?._id ||
        null;

      setCreatedVaultId(newId);
      const slug = makeSafeSlug(vaultName || monthName(), newId || "");
      setCreatedSlug(slug);
      setSuccessOpen(true);
    } catch (e: any) {
      setError(e?.message || "Failed to create vault.");
    } finally {
      setSubmitting(false);
    }
  }

  const viewVault = () => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setSuccessOpen(false);
      router.replace("/customer/vault");
      return;
    }
    if (createdSlug && createdVaultId) {
      const q = new URLSearchParams();
      q.set("customerId", customerId);
      q.set("vaultId", createdVaultId);
      setSuccessOpen(false);
      router.push(`/customer/vault/${encodeURIComponent(createdSlug)}?${q}`);
    } else {
      setSuccessOpen(false);
      router.push(
        `/customer/vault?customerId=${encodeURIComponent(customerId)}`
      );
    }
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

          {error && <p className="text-[12px] text-rose-600 mb-3">{error}</p>}
        </div>

        {/* Form */}
        <div className="px-4 pb-8 space-y-5">
          {/* Name (optional edit) */}
          <div>
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Name (defaults to current month)
            </label>
            <input
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="e.g., October"
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />
          </div>

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
              {[1000, 2000, 3000, 5000].map((n) => {
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
              {(["daily", "weekly", "monthly"] as const).map((k) => {
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
                    {k[0].toUpperCase() + k.slice(1)}
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
                  if (e.target.checked) setDurationMonths(1);
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
                Start next month
              </button>
            </div>
          </div>

          {/* CTA */}
          <button
            disabled={!valid || submitting}
            onClick={createVault}
            className={`w-full h-12 rounded-xl font-semibold transition ${
              valid
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {submitting ? "Creating..." : "Create vault"}
          </button>
        </div>
      </div>

      {/* SUCCESS SHEET */}
      {successOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSuccessOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl animate-slide-up">
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-200" />
            <div className="mx-auto mb-5 h-24 w-24 rounded-full bg-gray-50 ring-2 ring-gray-50 flex items-center justify-center">
              <Check className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Success
            </h3>
            <p className="text-sm text-gray-600 text-center mt-1">
              You’ve successfully created a new vault
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
