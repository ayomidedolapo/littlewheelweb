"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, HelpCircle, X, AlertCircle } from "lucide-react";
import Image from "next/image";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------------- keep your existing helpers & types below ---------------- */
// NGN, getActiveCustomerId, bankLogoUrl, toTitle, maskAcct, getAuthToken,
// types SavedBank, VaultDetail, chips, etc… (unchanged)

/* ===== 1) Shell with Suspense (no hooks here) ===== */
export default function WithdrawPageShell() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-700">
            <LogoSpinner show />
            Loading…
          </div>
        </div>
      }
    >
      <WithdrawFromVaultPageInner />
    </Suspense>
  );
}

/* ===== 2) Move your old component into this “Inner” one ===== */
function WithdrawFromVaultPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // -------- everything below is exactly your old component body --------

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

  // … keep all your helpers from the original file …

  /* ---------- state ---------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"bank" | null>(null);
  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = useMemo(() => getAuthToken(), []);

  // persist scoped customerId if present
  useEffect(() => {
    const cid = sp.get("customerId");
    if (cid) {
      try {
        sessionStorage.setItem("lw_active_customer_id", cid);
        sessionStorage.removeItem("lw_onboarding_customer_id");
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customerId = getActiveCustomerId(sp);
  const vaultId = sp.get("vaultId") || "";

  // load vault + saved bank (UNCHANGED logic)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!customerId || !vaultId)
          throw new Error("Missing customerId or vaultId");
        setLoading(true);
        setError(null);

        const vRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults/${vaultId}`,
          {
            cache: "no-store",
            headers: token ? { "x-lw-auth": token } : undefined,
          }
        );
        if (!vRes.ok) throw new Error(`Vault HTTP ${vRes.status}`);
        const vj = await vRes.json().catch(() => ({}));
        const d = vj?.data || vj || {};
        const b =
          Number(
            d.availableBalance ??
              d.currentAmount ??
              d.currentBalance ??
              d.amount ??
              d.balance ??
              0
          ) || 0;

        if (!cancelled) {
          setVault({
            id: vaultId,
            name: d?.name,
            currentAmount: d?.currentAmount,
            currentBalance: d?.currentBalance,
            availableBalance: d?.availableBalance,
          });
          setBalance(b);
        }

        let saved: SavedBank | null = null;
        try {
          const r = await fetch("/api/v1/settings/withdrawal-method", {
            cache: "no-store",
            headers: token ? { "x-lw-auth": token } : undefined,
            credentials: "include",
          });
          if (r.ok) {
            const j = await r.json().catch(() => ({}));
            const d2 = j?.data || j?.method || j || {};
            const wmId =
              d2?.id ??
              d2?.methodId ??
              d2?.withdrawalMethodId ??
              d2?.data?.id ??
              d2?.data?.methodId ??
              d2?.data?.withdrawalMethodId ??
              null;

            const bankName = d2?.bankName || d2?.bank?.name || d2?.bank || "";
            const bankCode = d2?.bankCode || d2?.bank?.code || d2?.code || "";
            const logoUrl = d2?.logoUrl || d2?.bank?.logo || "";
            const accountNumber = d2?.accountNumber || d2?.account || "";
            const accountName = d2?.accountName || d2?.name || "";
            if (bankName && accountNumber) {
              saved = {
                id: wmId || undefined,
                withdrawalMethodId: wmId || undefined,
                bank: {
                  name: bankName,
                  code: bankCode,
                  logo: bankLogoUrl(bankName, logoUrl),
                },
                accountNumber: String(accountNumber),
                accountName: String(accountName || ""),
              };
            }
          }
        } catch {}
        if (!saved) {
          try {
            const raw = localStorage.getItem("lw_withdrawal_bank");
            if (raw) saved = JSON.parse(raw);
          } catch {}
        }
        if (!cancelled) setSavedBank(saved || null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, vaultId, token]);

  const numericAmount = Math.abs(Number(amount) || 0);
  const exceedsBalance = numericAmount > (balance || 0);
  const willReceive = Math.max(0, numericAmount);
  const serviceFee = 0;

  const canProceed = useMemo(() => {
    if (!numericAmount) return false;
    if (!customerId || !vaultId) return false;
    if (exceedsBalance) return false;
    if (method !== "bank") return false;
    if (!savedBank) return false;
    return true;
  }, [numericAmount, method, customerId, vaultId, savedBank, exceedsBalance]);

  const pickChip = (c: (typeof chips)[number]) => {
    if (c === "All") setAmount(String(balance || 0));
    else setAmount(String(c));
  };

  const openSummary = () => {
    if (!canProceed) return;
    setSheetOpen(true);
  };

  async function initWithdraw() {
    if (submitting) return;
    try {
      setSubmitting(true);
      setError(null);

      const amt = Math.floor(Math.abs(Number(numericAmount) || 0));
      if (!amt) {
        setError("Enter a valid amount.");
        return;
      }
      if (amt > (balance || 0)) {
        setError("Amount exceeds available balance.");
        return;
      }

      const idemKey = `wd-${customerId}-${vaultId}-${amt}-${Date.now()}`;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 45_000);

      const payload: Record<string, any> = {
        amount: amt,
        method: "BANK_TRANSFER",
        narration: `Vault withdrawal ${
          vault?.name ? `(${vault.name})` : ""
        }`.trim(),
        ...(savedBank?.withdrawalMethodId
          ? { withdrawalMethodId: savedBank.withdrawalMethodId }
          : savedBank?.id
          ? { withdrawalMethodId: savedBank.id }
          : {}),
        ...(savedBank
          ? {
              bankName: savedBank.bank.name,
              bankCode: String(savedBank.bank.code || ""),
              accountNumber: savedBank.accountNumber,
              accountName: savedBank.accountName,
            }
          : {}),
      };

      const res = await fetch(
        `/api/v1/agent/customers/${customerId}/vaults/${vaultId}/withdraw/initialize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-idempotency-key": idemKey,
            ...(token ? { "x-lw-auth": token } : {}),
          },
          cache: "no-store",
          body: JSON.stringify(payload),
          signal: ac.signal,
        }
      );

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json")
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");

      if (!res.ok) {
        let msg =
          (typeof data === "object" && (data?.message || data?.error)) ||
          (typeof data === "string" && data) ||
          `Initialize failed (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      const ref =
        (typeof data === "object" &&
          (data?.data?.id ||
            data?.data?.reference ||
            data?.reference ||
            data?.transactionReference)) ||
        "";

      setSheetOpen(false);

      const qs = new URLSearchParams({
        customerId: String(customerId),
        vaultId: String(vaultId),
        amount: String(amt),
      });
      if (ref) qs.set("ref", String(ref));
      router.push(`/customer/vault/withdraw/face?${qs.toString()}`);

      clearTimeout(timer);
    } catch (e: any) {
      setError(
        e?.name === "AbortError"
          ? "Request timed out. Please try again."
          : e?.message || "Couldn’t initialize withdrawal."
      );
      setSheetOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- UI (unchanged) ---------- */
  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* header */}
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <HelpCircle className="w-5 h-5 text-gray-400" aria-label="Help" />
        </div>

        <div className="px-4 py-2">
          <h1 className="text-[22px] font-semibold text-gray-900">
            Savings Withdrawal
          </h1>
          <p className="text-[12px] text-gray-600 mt-1">
            Facilitate withdrawal for your customer
          </p>

          {/* subtle inline loader while fetching page data */}
          {loading && (
            <div
              role="status"
              aria-live="polite"
              className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700"
            >
              <LogoSpinner show={true} />
              Loading…
            </div>
          )}
        </div>

        {/* amount card */}
        <div className="px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <p className="text-[12px] font-semibold text-gray-800 mb-2">
              Amount to withdraw
            </p>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d]/g, ""));
                if (error) setError(null);
              }}
              placeholder="Enter Amount"
              className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black"
              aria-invalid={exceedsBalance}
            />

            <div className="mt-2 text-[12px]">
              <p className="text-gray-600">
                Available balance:{" "}
                <span className="font-semibold text-gray-900">
                  {loading ? "…" : NGN(balance)}
                </span>
              </p>
              {exceedsBalance && (
                <p className="mt-1 text-rose-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Amount exceeds available balance.
                </p>
              )}
            </div>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {chips.map((c) => (
                <button
                  key={String(c)}
                  onClick={() => pickChip(c)}
                  className="px-4 h-10 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 active:scale-[0.98]"
                >
                  {c === "All" ? "All" : NGN(c).replace(".00", "")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* method */}
        <div className="px-4 mt-5">
          <p className="text-[13px] font-semibold text-gray-900 mb-2">
            Select a Withdrawal Method
          </p>

          {/* Bank Account option */}
          <button
            type="button"
            onClick={() => setMethod(method === "bank" ? null : "bank")}
            className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  {/* bank icon */}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M3 10L12 4l9 6" stroke="black" strokeWidth="1.5" />
                    <path
                      d="M5 10v8M9 10v8M15 10v8M19 10v8"
                      stroke="black"
                      strokeWidth="1.5"
                    />
                    <path d="M3 18h18" stroke="black" strokeWidth="1.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">
                    Bank Account
                  </p>
                  <p className="text-[12px] text-gray-600">
                    Transfer funds directly to your customer account
                  </p>
                </div>
              </div>
              <span
                className={`inline-block h-5 w-5 rounded-full border-2 ${
                  method === "bank"
                    ? "border-black bg-black"
                    : "border-gray-300"
                }`}
                aria-pressed={method === "bank"}
              />
            </div>

            {/* selected & saved bank */}
            {method === "bank" && savedBank && (
              <div className="mt-4 w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                    <Image
                      src={bankLogoUrl(
                        savedBank.bank.name,
                        savedBank.bank.logo
                      )}
                      alt={savedBank.bank.name}
                      width={24}
                      height={24}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold leading-tight">
                      {toTitle(savedBank.accountName || "—")}
                    </div>
                    <div className="text-[12px] text-white/70 mt-0.5">
                      {maskAcct(savedBank.accountNumber)}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-white/70 ml-3">
                  {savedBank.bank.name}
                </div>
              </div>
            )}

            {/* If no bank saved, nudge */}
            {method === "bank" && !savedBank && (
              <div className="mt-3 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                No withdrawal bank set. Go to{" "}
                <strong>Settings → Withdrawal Bank</strong> to add one.
              </div>
            )}
          </button>
        </div>

        {/* footer */}
        <div className="px-4 py-6 mt-auto">
          <button
            onClick={openSummary}
            disabled={!canProceed}
            className={`w-full h-12 rounded-2xl font-semibold text-white ${
              canProceed
                ? "bg-black hover:bg-black/90"
                : "bg-black/30 cursor-not-allowed"
            }`}
          >
            Confirm Withdrawal
          </button>

          {error && (
            <p className="mt-3 text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}
        </div>
      </div>

      {/* ===== Bottom Sheet: Withdrawal Summary ===== */}
      <div
        className={`fixed inset-0 z-50 ${
          sheetOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${
            sheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSheetOpen(false)}
        />
        <div
          className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
            sheetOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                Withdrawal Summary
              </h3>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="space-y-4 text-[14px] mt-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold">{NGN(numericAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Service Fee</span>
                <span className="font-semibold text-rose-600">
                  {serviceFee ? "-" + NGN(serviceFee) : "-0"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Will Receive</span>
                <span className="font-semibold text-emerald-600">
                  {NGN(willReceive)}
                </span>
              </div>
            </div>

            <button
              onClick={initWithdraw}
              disabled={submitting}
              className="mt-5 w-full h-12 rounded-2xl bg-black text-white font-semibold active:scale-[0.99] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {submitting && <LogoSpinner show={true} />}{" "}
              {submitting ? "Processing…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
