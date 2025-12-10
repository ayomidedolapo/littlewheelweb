/* src/app/customer/vault/withdraw/page.tsx */
"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  TouchEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import Image from "next/image";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------- Types & helpers ---------- */

type SavedBank = {
  id?: string;
  withdrawalMethodId?: string;
  bank: {
    name: string;
    code?: string;
    logo?: string;
  };
  accountNumber: string;
  accountName: string;
};

type VaultDetail = {
  id: string;
  name?: string;
  currentAmount?: number;
  currentBalance?: number;
  availableBalance?: number;
};

type Bank = { name: string; code: string | number; logo?: string };

type Beneficiary = "self" | "customer";

/** quick amount chips – All first */
const chips = ["All", 1000, 2000, 5000, 10000] as const;

/** simple bank logo resolver */
function bankLogoUrl(bankName: string, fallback?: string): string {
  if (fallback) return fallback;
  return `/bank-logos/${bankName.replace(/\s+/g, "-").toLowerCase()}.png`;
}

/** Title-case helper */
function toTitle(s: string): string {
  return (s || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

/** Mask account number, show last 4 digits */
function maskAcct(acct: string): string {
  const clean = String(acct || "").replace(/\D/g, "");
  if (!clean) return "••••••••••";
  const last4 = clean.slice(-4);
  return `••••••${last4}`;
}

/** Read auth token from storage (client-side only) */
function getAuthToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("lw_token") ||
      sessionStorage.getItem("lw_token") ||
      null
    );
  } catch {
    return null;
  }
}

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

/* ===== 2) Inner component with hooks ===== */
function WithdrawFromVaultPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

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

  /* ---------- state ---------- */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"bank" | null>(null);
  const [vault, setVault] = useState<VaultDetail | null>(null);
  const [balance, setBalance] = useState<number>(0);

  const [agentBank, setAgentBank] = useState<SavedBank | null>(null);
  const [customerBank, setCustomerBank] = useState<SavedBank | null>(null);

  // default to Agent
  const [beneficiary, setBeneficiary] = useState<Beneficiary>("self");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // bottom sheet for customer bank form
  const [customerBankSheetOpen, setCustomerBankSheetOpen] = useState(false);

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

  // load vault + agent + customer saved banks
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!customerId || !vaultId)
          throw new Error("Missing customerId or vaultId");
        setLoading(true);
        setError(null);

        // vault
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

        // agent withdrawal bank (settings)
        let agent: SavedBank | null = null;
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
              agent = {
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

        if (!agent) {
          try {
            const raw = localStorage.getItem("lw_withdrawal_bank");
            if (raw) agent = JSON.parse(raw);
          } catch {}
        }

        if (!cancelled) setAgentBank(agent || null);

        // customer withdrawal bank – backend (if configured) or per-customer local cache
        let customer: SavedBank | null = null;

        if (customerId && token) {
          try {
            const r = await fetch(
              `/api/v1/agent/customers/${customerId}/set-withdrawal-method`,
              {
                cache: "no-store",
                headers: { "x-lw-auth": token },
                credentials: "include",
              }
            );
            if (r.ok) {
              const j = await r.json().catch(() => ({}));
              const d3 = j?.data || j?.method || j || {};
              const bankName =
                d3?.bankName || d3?.bank?.name || d3?.bank || "";
              const bankCode =
                d3?.bankCode || d3?.bank?.code || d3?.code || "";
              const logoUrl = d3?.logoUrl || d3?.bank?.logo || "";
              const accountNumber = d3?.accountNumber || d3?.account || "";
              const accountName = d3?.accountName || d3?.name || "";
              if (bankName && accountNumber) {
                customer = {
                  id:
                    d3?.id ??
                    d3?.withdrawalMethodId ??
                    d3?.data?.id ??
                    undefined,
                  withdrawalMethodId:
                    d3?.withdrawalMethodId ||
                    d3?.id ||
                    d3?.data?.id ||
                    undefined,
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
          } catch {
            // ignore – will fall back to local cache
          }
        }

        // fallback: per-customer localStorage
        if (!customer && customerId) {
          try {
            const raw = localStorage.getItem(
              `lw_customer_withdrawal_bank:${customerId}`
            );
            if (raw) customer = JSON.parse(raw);
          } catch {}
        }

        if (!cancelled) setCustomerBank(customer || null);
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

  const activeBank: SavedBank | null =
    beneficiary === "self" ? agentBank : customerBank;

  const canProceed = useMemo(() => {
    if (!numericAmount) return false;
    if (!customerId || !vaultId) return false;
    if (exceedsBalance) return false;
    if (method !== "bank") return false;
    if (!activeBank) return false;
    return true;
  }, [
    numericAmount,
    method,
    customerId,
    vaultId,
    activeBank,
    exceedsBalance,
  ]);

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
      if (!beneficiary) {
        setError("Select who should receive the funds.");
        return;
      }
      if (!activeBank) {
        setError(
          beneficiary === "self"
            ? "Set your withdrawal bank in Settings first."
            : "Set a withdrawal bank for this customer first."
        );
        return;
      }

      const idemKey = `wd-${customerId}-${vaultId}-${beneficiary}-${amt}-${Date.now()}`;
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 45_000);

      // Backend (via proxy route) now needs { amount, beneficiary }
      const payload = {
        amount: amt,
        beneficiary,
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
          (typeof data === "object" && (data as any)?.message) ||
          (typeof data === "object" && (data as any)?.error) ||
          (typeof data === "string" && data) ||
          `Initialize failed (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      const ref =
        (typeof data === "object" &&
          ((data as any)?.data?.id ||
            (data as any)?.data?.reference ||
            (data as any)?.reference ||
            (data as any)?.transactionReference)) ||
        "";

      setSheetOpen(false);

      const qs = new URLSearchParams({
        customerId: String(customerId),
        vaultId: String(vaultId),
        amount: String(amt),
        beneficiary,
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

  /* ----- swipe handling for bank mode ----- */
  const swipeStartX = useRef<number | null>(null);

  const handleSwipeStart = (e: TouchEvent<HTMLDivElement>) => {
    swipeStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleSwipeEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (swipeStartX.current == null) return;
    const dx = e.changedTouches[0]?.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < 40) return; // ignore tiny drags
    if (dx < 0) {
      // swipe left → go to customer
      setBeneficiary("customer");
    } else {
      // swipe right → go to agent
      setBeneficiary("self");
    }
  };

  /* ---------- UI ---------- */
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
                    Transfer funds to your bank or your customer’s bank
                  </p>
                </div>
              </div>
              <span
                className={`inline-block h-5 w-5 rounded-full border-2 ${
                  method === "bank"
                    ? "border-black bg-black ring-2 ring-black"
                    : "border-gray-300"
                }`}
                aria-pressed={method === "bank"}
              />
            </div>

            {/* selected & saved bank(s) – swipeable */}
            {method === "bank" && (
              <div className="mt-4">
                {/* swipe container */}
                <div
                  className="relative overflow-hidden rounded-2xl"
                  onTouchStart={handleSwipeStart}
                  onTouchEnd={handleSwipeEnd}
                >
                  <div
                    className="flex transition-transform duration-300 ease-out"
                    style={{
                      transform:
                        beneficiary === "self"
                          ? "translateX(0%)"
                          : "translateX(-100%)",
                    }}
                  >
                    {/* Agent card */}
                    <div className="w-full flex-shrink-0 pr-2">
                      {agentBank ? (
                        <div className="w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                              <Image
                                src={bankLogoUrl(
                                  agentBank.bank.name,
                                  agentBank.bank.logo
                                )}
                                alt={agentBank.bank.name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold leading-tight">
                                {toTitle(agentBank.accountName || "—")}
                              </div>
                              <div className="text-[12px] text-white/70 mt-0.5">
                                {maskAcct(agentBank.accountNumber)}
                              </div>
                            </div>
                          </div>
                          <div className="text-[11px] text-white/70 ml-3">
                            {agentBank.bank.name}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-gray-400 px-4 py-3 text-[12px] text-gray-700 bg-gray-50">
                          No withdrawal bank set for you yet. Go to{" "}
                          <strong>Settings → Withdrawal Bank</strong> to add
                          one.
                        </div>
                      )}
                    </div>

                    {/* Customer card */}
                    <div className="w-full flex-shrink-0 pl-2">
                      {customerBank ? (
                        <div className="w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                              <Image
                                src={bankLogoUrl(
                                  customerBank.bank.name,
                                  customerBank.bank.logo
                                )}
                                alt={customerBank.bank.name}
                                width={24}
                                height={24}
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                            <div>
                              <div className="text-[13px] font-semibold leading-tight">
                                {toTitle(customerBank.accountName || "—")}
                              </div>
                              <div className="text-[12px] text-white/70 mt-0.5">
                                {maskAcct(customerBank.accountNumber)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] text-amber-800">
                          No withdrawal bank set for this customer yet.
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerBankSheetOpen(true);
                            }}
                            className="ml-1 underline font-semibold"
                          >
                            Set customer bank
                          </button>
                          .
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* mode toggles */}
                <div className="mt-3 flex justify-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBeneficiary("self");
                    }}
                    className={`px-3 py-1.5 rounded-lg border ${
                      beneficiary === "self"
                        ? "bg-black text-white border-black"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBeneficiary("customer");
                    }}
                    className={`px-3 py-1.5 rounded-lg border ${
                      beneficiary === "customer"
                        ? "bg-black text-white border-black"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    Customer
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-gray-500 text-center">
                  Swipe or tap to choose who receives the funds.
                </p>
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
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Beneficiary</span>
                <span className="font-semibold text-gray-900">
                  {beneficiary === "self" ? "Agent" : "Customer"}
                </span>
              </div>
            </div>

            <button
              onClick={initWithdraw}
              disabled={submitting}
              className="mt-5 w-full h-12 rounded-2xl bg-black text-white font-semibold active:scale-[0.99] disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {/* ✅ Spinner removed inside popup */}
              {submitting ? "Processing…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Customer bank bottom sheet (Add only, no edit) ===== */}
      {customerId && (
        <CustomerBankSheet
          open={customerBankSheetOpen}
          onClose={() => setCustomerBankSheetOpen(false)}
          customerId={customerId}
          token={token}
          existing={customerBank}
          onSaved={(b) => setCustomerBank(b)}
        />
      )}
    </div>
  );
}

/* ===== 3) Customer bank sheet – ADD only, no backend update ===== */

function CustomerBankSheet({
  open,
  onClose,
  customerId,
  token,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  token: string | null;
  existing: SavedBank | null;
  onSaved: (b: SavedBank) => void;
}) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // For "add only", we don't pre-fill from existing for editing
  const [bank, setBank] = useState<Bank | null>(null);
  const [acct, setAcct] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolveAbort = useRef<AbortController | null>(null);

  // Load banks
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setBanksLoading(true);
        setBanksError(null);
        const r = await fetch("/api/v1/payments/bank-list", {
          headers: token ? { "x-lw-auth": token } : undefined,
          credentials: "include",
        });
        const json = await r.json().catch(() => ({}));
        const raw = json?.data || json;
        if (Array.isArray(raw)) setBanks(raw as Bank[]);
        else if (Array.isArray(json)) setBanks(json as Bank[]);
        else throw new Error("Unexpected bank list response");
      } catch (e: any) {
        setBanksError(
          e instanceof Error ? e.message : "Failed to load bank list"
        );
      } finally {
        setBanksLoading(false);
      }
    })();
  }, [open, token]);

  // Reset form each time sheet opens (add-only)
  useEffect(() => {
    if (open) {
      setBank(null);
      setAcct("");
      setResolvedName("");
      setError(null);
      setQ("");
    }
  }, [open]);

  useEffect(() => {
    setError(null);
  }, [bank, acct]);

  // resolve account name when bank + 10 digits
  useEffect(() => {
    const digits = acct.replace(/\D/g, "");
    if (!bank || digits.length !== 10 || !open) {
      resolveAbort.current?.abort();
      return;
    }

    const t = setTimeout(async () => {
      try {
        setResolving(true);
        resolveAbort.current?.abort();
        const ac = new AbortController();
        resolveAbort.current = ac;

        const r = await fetch(
          `/api/v1/payments/resolve-account-number?accountNumber=${digits}&bankCode=${bank.code}`,
          {
            headers: token ? { "x-lw-auth": token } : undefined,
            credentials: "include",
            signal: ac.signal,
          }
        );

        const json = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = json?.message || json?.error || `HTTP ${r.status}`;
          throw new Error(msg);
        }

        const name =
          json?.data?.accountName ||
          json?.data?.account_name ||
          json?.accountName ||
          json?.account_name ||
          "";

        setResolvedName(name || "");
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setResolvedName("");
          setError(
            e instanceof Error ? e.message : "Name resolve failed. Try again."
          );
        }
      } finally {
        setResolving(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [bank, acct, token, open]);

  const filteredBanks = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return banks;
    return banks.filter((b) => String(b.name).toLowerCase().includes(t));
  }, [q, banks]);

  const canSubmit =
    !!bank && acct.replace(/\D/g, "").length === 10 && !!resolvedName && !saving;

  async function onConfirm() {
    if (!canSubmit) return;
    try {
      setSaving(true);
      setError(null);

      const saved: SavedBank = {
        bank: {
          name: bank!.name,
          code: bank!.code,
          logo: bankLogoUrl(bank!.name, bank?.logo),
        },
        accountNumber: acct,
        accountName: resolvedName,
      };

      // purely local cache per-customer (no backend update)
      try {
        localStorage.setItem(
          `lw_customer_withdrawal_bank:${customerId}`,
          JSON.stringify(saved)
        );
      } catch {}

      onSaved(saved);
      onClose();
    } catch (e: any) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to save customer withdrawal bank"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
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
        className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-5 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900">
              Add customer bank
            </h3>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          {/* Bank selector */}
          <label className="block text-[12px] text-gray-700 mb-1">
            Bank name
          </label>
          <button
            type="button"
            className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {bank ? (
                <Image
                  src={bankLogoUrl(bank.name, bank.logo)}
                  alt={bank.name}
                  width={18}
                  height={18}
                  className="object-contain"
                />
              ) : null}
              <span className={bank ? "text-gray-900" : "text-gray-400"}>
                {bank ? bank.name : "Select Bank"}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {/* inline bank list when user types/searches */}
          <div className="mt-3 rounded-2xl border border-gray-100">
            <div className="px-3 pt-2 pb-2 border-b border-gray-100">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search bank"
                className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
              />
            </div>
            <div className="max-h-40 overflow-y-auto">
              {banksLoading ? (
                <div className="px-3 py-3 text-[13px] text-gray-500">
                  Loading banks…
                </div>
              ) : banksError ? (
                <div className="px-3 py-3 text-[12px] text-rose-600 flex gap-2 items-start">
                  <AlertCircle className="w-4 h-4 mt-[2px]" />
                  <span>{banksError}</span>
                </div>
              ) : (
                filteredBanks.map((b) => (
                  <button
                    key={`${b.code}-${b.name}`}
                    type="button"
                    onClick={() => setBank(b)}
                    className="w-full text-left px-3 py-2 border-b last:border-b-0 border-gray-100 hover:bg-gray-50 flex items-center gap-2 text-[13px]"
                  >
                    <Image
                      src={bankLogoUrl(String(b.name), b.logo)}
                      alt={String(b.name)}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                    <span>{b.name}</span>
                  </button>
                ))
              )}
              {!banksLoading && !banksError && filteredBanks.length === 0 && (
                <div className="px-3 py-3 text-[13px] text-gray-500">
                  No banks found.
                </div>
              )}
            </div>
          </div>

          {/* Account number input */}
          <div className="mt-4">
            <label className="block text-[12px] text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="e.g 3120221108"
              value={acct}
              onChange={(e) =>
                setAcct(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
            />
          </div>

          {/* Resolved chip */}
          {resolvedName && (
            <div className="mt-3 w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-[2px] w-6 h-6 rounded bg-white overflow-hidden flex items-center justify-center">
                  {bank && (
                    <Image
                      src={bankLogoUrl(bank.name, bank.logo)}
                      alt={bank.name}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  )}
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-tight">
                    {toTitle(resolvedName)}
                  </div>
                  <div className="text-[12px] text-white/70 mt-0.5">
                    {maskAcct(acct)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <AlertCircle className="w-4 h-4 mt-[2px]" />
              <p>{error}</p>
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={onConfirm}
            disabled={!canSubmit || resolving || saving}
            className={`mt-5 w-full h-12 rounded-xl font-semibold text-white transition ${
              canSubmit && !resolving && !saving
                ? "bg-black hover:bg-black/90"
                : "bg-black/30 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : resolving ? "Resolving…" : "Confirm Bank"}
          </button>
        </div>
      </div>
    </div>
  );
}
