/* app/customer/vault/deposit/page.tsx */
"use client";

import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, HelpCircle, X, Check, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useAgentBalances } from "../../../../app/hooks/useAgentBalances";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------------- utils ---------------- */
const NGN = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

function toNumber(x: string | number | undefined): number {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const cleaned = x.replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const fourChips = [500, 1000, 5000, 10000];

/* ---------------- types ---------------- */
type CustomerLite = {
  firstName?: string;
  lastName?: string;
  status?: string;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  avatar?: string | null;
};
type VaultDetail = {
  id: string;
  name?: string;
  currentAmount?: number;
  currentBalance?: number;
};

/* ---------------- wrapper component ---------------- */
function DepositInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [isRouting, startTransition] = useTransition();

  const customerId = getActiveCustomerId(sp);
  const vaultId = sp.get("vaultId") || "";

  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [vaultBalance, setVaultBalance] = useState<number>(0);

  const {
    creditBalance,
    loading: balancesLoading,
    refresh: refreshBalances,
  } = useAgentBalances();

  const [previewOpen, setPreviewOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinDigits, setPinDigits] = useState(["", "", "", ""]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [depositedAmount, setDepositedAmount] = useState<number>(0);

  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }
  const token = tokenRef.current;

  const pin = pinDigits.join("");

  useEffect(() => {
    const cid = sp.get("customerId");
    if (cid) {
      try {
        sessionStorage.setItem("lw_active_customer_id", cid);
        sessionStorage.removeItem("lw_onboarding_customer_id");
      } catch {}
    }
  }, [sp]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!customerId) throw new Error("Missing customerId");
        if (!vaultId) throw new Error("Missing vaultId");

        setLoading(true);
        setError(null);

        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const cRes = await fetch(`/api/v1/agent/customers/${customerId}`, {
          cache: "no-store",
          headers,
        });
        if (!cRes.ok) throw new Error(`Customer HTTP ${cRes.status}`);
        const cj = await cRes.json().catch(() => ({}));
        const c = cj?.data || cj || {};
        const cust: CustomerLite = {
          firstName: c.firstName || "",
          lastName: c.lastName || "",
          status: (c.status || "ACTIVE").toString(),
          avatarUrl: c.avatarUrl || c.profileImageUrl || c.avatar || null,
          profileImageUrl: c.profileImageUrl || null,
          avatar: c.avatar || null,
        };

        const vRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults/${vaultId}`,
          { cache: "no-store", headers }
        );
        if (!vRes.ok) throw new Error(`Vault HTTP ${vRes.status}`);
        const vj = await vRes.json().catch(() => ({}));
        const d = vj?.data || vj || {};
        const vd: VaultDetail = {
          id: vaultId,
          name: d.name,
          currentAmount: toNumber(d.currentAmount),
          currentBalance: toNumber(d.currentBalance),
        };
        const vbal = toNumber(d.currentAmount ?? d.currentBalance ?? 0);

        if (!cancelled) {
          setCustomer(cust);
          setVault(vd);
          setVaultBalance(vbal);
        }

        refreshBalances();
      } catch (e: unknown) {
        const msg =
          typeof e === "object" && e && "message" in e
            ? String((e as any).message)
            : "Failed to load details.";
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, vaultId, token, refreshBalances]);

  const setQuick = (n: number) => setAmount(String(n));

  const openPreview = () => {
    const n = Math.abs(toNumber(amount));
    if (!n || n <= 0) return;
    if (n > creditBalance) {
      setError(
        `Insufficient credit balance. Available: ${NGN(
          creditBalance
        )}. Reduce the amount or add credit.`
      );
      return;
    }
    setError(null);
    setPreviewOpen(true);
  };

  const confirmFromPreview = () => {
    setPreviewOpen(false);
    setPinError(null);
    setPinDigits(["", "", "", ""]);
    setTimeout(() => setPinOpen(true), 80);
  };

  const canProceed = () => {
    const n = Math.abs(toNumber(amount));
    const busy = loading || balancesLoading;
    return n > 0 && !busy && !!customerId && !!vaultId && n <= creditBalance;
  };

  async function submitDeposit() {
    if (pin.length !== 4) {
      setPinError("Enter your 4-digit PIN.");
      return;
    }
    const n = Math.abs(toNumber(amount));
    if (n > creditBalance) {
      setPinError(
        `Insufficient credit balance. Available: ${NGN(creditBalance)}.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setPinError(null);
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(
        `/api/v1/agent/customers/${customerId}/vaults/${vaultId}/deposit`,
        {
          method: "POST",
          headers,
          cache: "no-store",
          body: JSON.stringify({
            amount: String(n),
            pin,
            ...(note ? { narration: note } : {}),
          }),
        }
      );

      const j = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(j?.message || `Deposit failed (HTTP ${res.status}).`);

      setPinOpen(false);
      setDepositedAmount(n);
      setSuccessOpen(true);
      setVaultBalance((b) => (b || 0) + n);
      setTimeout(() => refreshBalances(), 400);
      setAmount("");
      setNote("");
    } catch (e: any) {
      setPinError(e?.message || "Couldn’t complete deposit.");
    } finally {
      setSubmitting(false);
    }
  }

  const fullName =
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() ||
    "Customer";
  const avatarSrc =
    customer?.avatarUrl || customer?.profileImageUrl || customer?.avatar || "";

  /* ---------------- UI ---------------- */
  return (
    <>
      {/* ✅ Global route spinner */}
      <LogoSpinner show={isRouting} />

      <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* header */}
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <button
              onClick={() => startTransition(() => router.back())}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <HelpCircle className="w-5 h-5 text-gray-400" />
          </div>

          <div className="px-4 py-2">
            <h1 className="text-[22px] font-semibold text-gray-900">
              Money Transfer
            </h1>
          </div>

          {/* card: user row */}
          <div className="px-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-rose-50 text-black flex items-center justify-center text-sm font-bold">
                    {avatarSrc ? (
                      <Image
                        src={avatarSrc}
                        alt={fullName}
                        width={48}
                        height={48}
                        className="w-12 h-12 object-cover rounded-full"
                        unoptimized
                      />
                    ) : (
                      fullName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {loading ? (
                        <span className="inline-flex items-center gap-2">
                          <LogoSpinner show={true} /> …
                        </span>
                      ) : (
                        fullName
                      )}
                    </p>
                    {vault?.name ? (
                      <p className="text-[12px] text-gray-500 truncate">
                        {vault.name}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-[12px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* amount block */}
          <div className="px-4 mt-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold text-gray-800 mb-2">
                  Amount to Deposit
                </p>
                <p className="text-[12px] text-gray-600 inline-flex items-center gap-2">
                  Credit:{" "}
                  <span className="font-semibold inline-flex items-center gap-2">
                    {balancesLoading ? (
                      <>
                        <LogoSpinner show={true} />
                        <span>Fetching…</span>
                      </>
                    ) : (
                      NGN(creditBalance)
                    )}
                  </span>
                </p>
              </div>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  setAmount(raw.slice(0, 12));
                  if (error) setError(null);
                }}
                placeholder="Amount"
                className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black"
              />

              <p className="text-[12px] text-gray-600 mt-3">
                Current vault balance:{" "}
                <span className="font-semibold text-emerald-600">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <LogoSpinner show={true} /> …
                    </span>
                  ) : (
                    NGN(vaultBalance)
                  )}
                </span>
              </p>

              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {fourChips.map((c) => (
                  <button
                    key={c}
                    onClick={() => setQuick(c)}
                    className="px-4 h-10 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98]"
                  >
                    {NGN(c).replace(".00", "")}
                  </button>
                ))}
              </div>

              <label className="block text-[12px] text-gray-800 mt-4 mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)"
                title="Notes for this deposit (optional)"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black resize-none"
              />
            </div>
          </div>

          {/* footer button */}
          <div className="px-4 py-6 mt-auto">
            <button
              onClick={openPreview}
              disabled={!canProceed()}
              className={`w-full h-12 rounded-2xl font-semibold text-white ${
                canProceed()
                  ? "bg-black hover:bg-black/90"
                  : "bg-black/30 cursor-not-allowed"
              }`}
            >
              Proceed
            </button>

            {error && (
              <p className="mt-3 text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* ===== Bottom Sheet: Transaction Preview ===== */}
        <div
          className={`fixed inset-0 z-50 ${
            previewOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              previewOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setPreviewOpen(false)}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
              previewOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Transaction Preview
                </h3>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                  title="Close preview"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <div className="space-y-4 text-[14px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Amount to deposit</span>
                  <span className="font-semibold">
                    {NGN(Math.abs(toNumber(amount)))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Narration</span>
                  <span className="font-medium">{note ? note : "Nil"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              <button
                onClick={confirmFromPreview}
                className="mt-5 w-full h-12 rounded-2xl bg-black text-white font-semibold active:scale-[0.99]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>

        {/* ===== Bottom Sheet: Enter PIN ===== */}
        <div
          className={`fixed inset-0 z-50 ${
            pinOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              pinOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => !submitting && setPinOpen(false)}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
              pinOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">
                  Enter PIN to confirm
                </h3>
                <button
                  onClick={() => !submitting && setPinOpen(false)}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                  title="Close PIN entry"
                >
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <div className="mt-2 flex items-center gap-3 justify-between">
                {pinDigits.map((d, i) => (
                  <input
                    key={i}
                    value={d}
                    inputMode="numeric"
                    maxLength={1}
                    placeholder="•"
                    title={`PIN digit ${i + 1}`}
                    onChange={(e) => {
                      const v = e.target.value
                        .replace(/[^\d]/g, "")
                        .slice(0, 1);
                      const next = [...pinDigits];
                      next[i] = v;
                      setPinDigits(next);
                      if (v && i < 3) {
                        const nextEl = (e.target as HTMLInputElement)
                          .nextElementSibling as HTMLInputElement | null;
                        nextEl?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !pinDigits[i] && i > 0) {
                        const prev = (e.target as HTMLInputElement)
                          .previousElementSibling as HTMLInputElement | null;
                        prev?.focus();
                      }
                      if (
                        e.key === "Enter" &&
                        pin.length === 4 &&
                        !submitting
                      ) {
                        submitDeposit();
                      }
                    }}
                    className="w-16 h-14 rounded-xl border border-gray-200 text-center text-lg font-semibold outline-none focus:ring-2 focus:ring-black"
                  />
                ))}
              </div>

              {pinError && (
                <div className="mt-3 text-sm text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                onClick={submitDeposit}
                disabled={submitting || pin.length !== 4}
                className={`mt-5 w-full h-12 rounded-2xl font-semibold text-white ${
                  pin.length === 4 && !submitting
                    ? "bg-black hover:bg-black/90"
                    : "bg-black/30 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <LogoSpinner show={false} /> Processing…
                  </span>
                ) : (
                  "Confirm Deposit"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Bottom Sheet: Success ===== */}
        <div
          className={`fixed inset-0 z-50 ${
            successOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity ${
              successOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setSuccessOpen(false)}
          />
          <div
            className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
              successOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-8 shadow-2xl">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Deposit Successful
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                {NGN(depositedAmount)} added to your vault.
              </p>
              <button
                onClick={() => {
                  setSuccessOpen(false);
                  const q = new URLSearchParams();
                  if (customerId) q.set("customerId", customerId);
                  startTransition(() =>
                    router.push(`/customer/vault/transaction-details?${q.toString()}`)
                  );
                }}
                className="w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ✅ Suspense wrapper fix */
export default function DepositToVaultPage() {
  return (
    <Suspense fallback={<LogoSpinner show={true} />}>
      <DepositInner />
    </Suspense>
  );
}
