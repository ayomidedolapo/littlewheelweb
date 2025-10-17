/* app/customer/vault/personal-vault/page.tsx */
"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Check, // <- use tick icon
} from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------- helpers ---------- */
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

function extractArray(payload: any): any[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.records)) return d.records;
  if (Array.isArray(d?.vaults)) return d.vaults;
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  return [];
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

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  const month = dt.toLocaleString(undefined, { month: "short" });
  return `${dt.getDate()} ${month}, ${dt.getFullYear()}`;
}

/* ---------- types ---------- */
type CustomerLite = {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
};

type Tx = {
  id: string;
  note: string;
  amount: number;
  at: string; // iso
  isCredit: boolean;
};

type APIVault = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: number | string;
  amount?: number | string;
};

type VaultRow = {
  id: string; // REAL api id
  name: string;
  balance: number;
  target: number;
  daily: number;
};

type VaultDetail = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: string | number;
  amount?: string | number;
  frequency?: string;
  duration?: string;
  startDate?: string;
  createdAt?: string;
  maturityDate?: string;
  endDate?: string;
  durationInDays?: number; // <- added
  balance?: string | number;
  currentAmount?: string | number;
  currentBalance?: string | number;
};

/* ----- compute maturity (fallback when API doesn't return maturityDate) ----- */
function computeMaturity(d?: VaultDetail | null): string | null {
  if (!d) return null;
  const m = d.maturityDate || d.endDate;
  if (m) return m;
  const start = d.startDate || d.createdAt;
  const days = Number(d.durationInDays ?? 0);
  if (!start || !days || Number.isNaN(days)) return null;
  const startDt = new Date(start);
  if (isNaN(startDt.getTime())) return null;
  const out = new Date(startDt);
  out.setDate(out.getDate() + days);
  return out.toISOString();
}

/* ================= Inner component ================= */

function PersonalVaultCustomerPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // ✅ Global route spinner
  const [isRouting, startTransition] = useTransition();

  // stable token
  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }
  const token = tokenRef.current;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [customer, setCustomer] = useState<CustomerLite | null>(null);
  const [totalSaved, setTotalSaved] = useState<number>(0);

  const [txs, setTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  /* ---- Header “Saving Plan” and “Withdrawal Date” ---- */
  const [headerPlan, setHeaderPlan] = useState<string>("—");
  const [headerWithdrawal, setHeaderWithdrawal] = useState<string>("—");

  /* ---- Deposit/Withdraw picker state ---- */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flow, setFlow] = useState<"deposit" | "withdraw">("deposit");
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [vaultsErr, setVaultsErr] = useState<string | null>(null);

  const openPicker = (mode: "deposit" | "withdraw") => {
    setFlow(mode);
    setSelectedVaultId(null);
    setPickerOpen(true);
  };

  const proceed = () => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId || !selectedVaultId) return;
    const q = new URLSearchParams();
    q.set("customerId", customerId);
    q.set("vaultId", selectedVaultId);
    startTransition(() =>
      router.push(
        flow === "deposit"
          ? `/customer/vault/deposit?${q.toString()}`
          : `/customer/vault/withdraw?${q.toString()}`
      )
    );
  };

  /* calendar state */
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth()); // 0-11

  const highlighted = useMemo(() => {
    const d = today;
    return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
  }, []);

  const daysInView = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ y: number; m: number; d: number; inMonth: boolean }> =
      [];

    for (let i = 0; i < startWeekday; i++) {
      const dt = new Date(year, month, -i);
      cells.unshift({
        y: dt.getFullYear(),
        m: dt.getMonth(),
        d: dt.getDate(),
        inMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ y: year, m: month, d, inMonth: true });
    }

    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const dt = new Date(last.y, last.m, last.d + 1);
      cells.push({
        y: dt.getFullYear(),
        m: dt.getMonth(),
        d: dt.getDate(),
        inMonth: false,
      });
    }
    return cells;
  }, [year, month]);

  /* load CUSTOMER + TOTAL BALANCE */
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setError("Missing customerId (query or session).");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = token ? { "x-lw-auth": token } : undefined;

        // Customer
        try {
          const rc = await fetch(`/api/v1/agent/customers/${customerId}`, {
            cache: "no-store",
            headers,
          });
          const jc = await rc.json().catch(() => ({}));
          const c = jc?.data || jc || {};
          if (!cancelled) {
            setCustomer({
              id: customerId,
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone || c.phoneNumber,
              phoneNumber: c.phoneNumber || c.phone,
            });
            try {
              sessionStorage.setItem("lw_active_customer_id", customerId);
            } catch {}
          }
        } catch {}

        // Total saved across vaults
        try {
          const balRes = await fetch(
            `/api/v1/agent/customers/${customerId}/vaults/balance`,
            {
              cache: "no-store",
              headers,
            }
          );
          const balJ = await balRes.json().catch(() => ({}));
          const bal = Number(balJ?.data?.balance ?? balJ?.balance ?? 0) || 0;
          if (!cancelled) setTotalSaved(bal);
        } catch {}
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sp, token]);

  /* ========= Header “Saving Plan” + “Withdrawal Date” (with maturity fallback) ========= */
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) return;

    let cancelled = false;
    (async () => {
      try {
        const headers = token ? { "x-lw-auth": token } : undefined;
        // 1) list ongoing
        const listRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults?status=ONGOING`,
          { headers, cache: "no-store" }
        );
        if (!listRes.ok) throw new Error(`Vaults HTTP ${listRes.status}`);
        const listJ = await listRes.json().catch(() => ({}));
        const apiVaults: APIVault[] = extractArray(listJ);

        if (!apiVaults?.length) {
          if (!cancelled) {
            setHeaderPlan("—");
            setHeaderWithdrawal("—");
          }
          return;
        }

        // 2) detail calls
        const details: VaultDetail[] = await Promise.all(
          apiVaults.map(async (v) => {
            const vid = v.id || v.vaultId || v._id || "";
            if (!vid) return null as any;
            try {
              const vr = await fetch(
                `/api/v1/agent/customers/${customerId}/vaults/${vid}`,
                { headers, cache: "no-store" }
              );
              if (!vr.ok) return null as any;
              const vj = await vr.json().catch(() => ({}));
              return (vj?.data ?? vj ?? null) as VaultDetail | null;
            } catch {
              return null as any;
            }
          })
        );

        const valid = (details || []).filter(Boolean);

        // Plan text
        const dailyVals = valid
          .map((d) => Number(d?.amount ?? 0))
          .filter((n) => Number.isFinite(n) && n > 0);

        let planText = "—";
        if (valid.length === 1 && dailyVals.length === 1) {
          // strip trailing .00 for compactness
          planText = `${NGN(dailyVals[0]).replace(/\.00$/, "")} daily`;
        } else if (valid.length > 1) {
          planText = "Multiple";
        }

        // Withdrawal date = earliest upcoming maturity
        const maturityDates = valid
          .map((d) => computeMaturity(d))
          .filter(Boolean)
          .map((s) => new Date(s as string))
          .filter((dt) => !isNaN(dt.getTime()));

        let wdText = "—";
        if (maturityDates.length) {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const future = maturityDates
            .filter((d) => d.getTime() >= startOfToday.getTime())
            .sort((a, b) => a.getTime() - b.getTime());
          const pick =
            future[0] ||
            maturityDates.sort((a, b) => a.getTime() - b.getTime())[0];
          wdText = fmtDate(pick);
        }

        if (!cancelled) {
          setHeaderPlan(planText);
          setHeaderWithdrawal(wdText);
        }
      } catch {
        if (!cancelled) {
          setHeaderPlan("—");
          setHeaderWithdrawal("—");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sp, token]);

  /* recent contributions (limit to 5) */
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) return;

    let cancelled = false;
    (async () => {
      try {
        setTxLoading(true);
        const headers = token ? { "x-lw-auth": token } : undefined;

        const res = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults/contributions`,
          {
            cache: "no-store",
            headers,
          }
        );
        if (!res.ok) throw new Error(`Contributions HTTP ${res.status}`);

        const j = await res.json().catch(() => ({}));
        const rows = extractArray(j);

        const mapped: Tx[] = (rows || [])
          .map((r: any, idx: number) => {
            const id =
              r.id ||
              r._id ||
              r.txId ||
              r.reference ||
              `contrib:${idx}:${r.createdAt || r.date || ""}`;
            const amount =
              Number(r.amount ?? r.value ?? r.contribution ?? 0) || 0;
            const created =
              r.createdAt || r.date || r.at || new Date().toISOString();
            const type = String(
              r.type || r.direction || r.kind || "CREDIT"
            ).toUpperCase();
            const isCredit =
              type.includes("CREDIT") || type.includes("DEPOSIT");
            const note =
              r.note || r.description || (isCredit ? "Saved" : "Withdrawal");

            return {
              id,
              note,
              amount: Math.abs(amount),
              at: new Date(created).toISOString(),
              isCredit,
            };
          })
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 5); // hard limit

        if (!cancelled) setTxs(mapped);
      } catch {
        if (!cancelled) setTxs([]);
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sp, token]);

  /* Load vaults when picker opens (unchanged except types) */
  useEffect(() => {
    if (!pickerOpen) return;
    const customerId = getActiveCustomerId(sp);
    if (!customerId) return;

    let cancelled = false;
    (async () => {
      try {
        setVaultsLoading(true);
        setVaultsErr(null);
        setVaults([]);
        setSelectedVaultId(null);

        const headers = token ? { "x-lw-auth": token } : undefined;

        // 1) list ONGOING vaults
        const listRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults?status=ONGOING`,
          {
            headers,
            cache: "no-store",
          }
        );
        if (!listRes.ok) throw new Error(`Vaults HTTP ${listRes.status}`);
        const listJ = await listRes.json();
        const apiVaults: APIVault[] = extractArray(listJ);

        // 2) enrich balances by REAL id
        const enriched = await Promise.all(
          (apiVaults || []).map(async (v): Promise<VaultRow> => {
            const apiId = v.id || v.vaultId || v._id || "";
            let detail: any = {};
            if (apiId) {
              try {
                const vr = await fetch(
                  `/api/v1/agent/customers/${customerId}/vaults/${apiId}`,
                  { headers, cache: "no-store" }
                );
                if (vr.ok) {
                  const vj = await vr.json();
                  detail = vj?.data ?? vj ?? {};
                }
              } catch {}
            }
            const currentBalance =
              Number(detail?.currentAmount ?? detail?.currentBalance ?? 0) || 0;

            return {
              id: apiId,
              name: v.name || detail?.name || "Personal Vault",
              balance: currentBalance,
              target: Number(v.targetAmount ?? detail?.targetAmount ?? 0) || 0,
              daily: Number(v.amount ?? detail?.amount ?? 0) || 0,
            };
          })
        );

        if (!cancelled) setVaults(enriched);
      } catch (e: any) {
        if (!cancelled) setVaultsErr(e?.message || "Failed to load vaults.");
      } finally {
        if (!cancelled) setVaultsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pickerOpen, sp, token]);

  const fullName =
    `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "—";

  const pct = (b: number, t: number) =>
    t ? Math.min(100, Math.round((b / t) * 100)) : 0;

  return (
    <>
      {/* ✅ Global route spinner */}
      <LogoSpinner show={isRouting} />

      <div className="min-h-screen bg-white flex items-start justify-center">
        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Back */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => startTransition(() => router.back())}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {/* Black summary card */}
          <div className="px-4">
            <div className="rounded-2xl bg-black text-white p-4">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <p className="text-[11px] text-white/70">Name</p>
                  <p className="text-[13px] font-semibold mt-0.5">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <LogoSpinner className="w-3.5 h-3.5" /> Loading…
                      </span>
                    ) : (
                      fullName
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/70">Total Saved</p>
                  <p className="text-[13px] font-extrabold mt-0.5">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <LogoSpinner className="w-3.5 h-3.5" /> …
                      </span>
                    ) : (
                      NGN(totalSaved)
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-white/70">Saving Plan</p>
                  <p className="text-[13px] font-semibold mt-0.5">
                    {headerPlan}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-white/70">Withdrawal Date</p>
                  <p className="text-[13px] font-semibold mt-0.5">
                    {headerWithdrawal}
                  </p>
                </div>

                {/* STATUS */}
                <div>
                  <p className="text-[11px] text-white/70">Status</p>
                  <p className="text-[13px] font-semibold mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-emerald-300">Active</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-white/70">Reg. Phone Number</p>
                  <p className="text-[13px] font-semibold mt-0.5">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <LogoSpinner className="w-3.5 h-3.5" /> …
                      </span>
                    ) : (
                      customer?.phoneNumber || customer?.phone || "—"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="px-4 mt-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold">
                    {new Date(year, month, 1).toLocaleString(undefined, {
                      month: "short",
                    })}{" "}
                    <span className="text-gray-600">▼</span>
                  </div>
                  <div className="text-sm font-semibold">
                    {year} <span className="text-gray-600">▼</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const m = month - 1;
                      if (m < 0) {
                        setMonth(11);
                        setYear((y) => y - 1);
                      } else setMonth(m);
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      const m = month + 1;
                      if (m > 11) {
                        setMonth(0);
                        setYear((y) => y + 1);
                      } else setMonth(m);
                    }}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-[12px] text-gray-500 mb-2">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <div key={d} className="text-center">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {daysInView.map((cell, i) => {
                  const isHighlighted =
                    cell.y === highlighted.y &&
                    cell.m === highlighted.m &&
                    cell.d === highlighted.d &&
                    cell.inMonth;

                  return (
                    <div
                      key={`${i}:${cell.y}-${cell.m}-${cell.d}`}
                      className={`h-9 rounded-lg border text-sm flex items-center justify-center ${
                        cell.inMonth
                          ? "bg-white border-gray-200 text-gray-900"
                          : "bg-white border-transparent text-gray-300"
                      } ${
                        isHighlighted
                          ? "ring-2 ring-emerald-300 bg-emerald-100"
                          : ""
                      }`}
                    >
                      {cell.d}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Transactions header */}
          <div className="px-4 mt-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-gray-900">
                Recent Transactions
              </p>
              <button
                onClick={() => {
                  const customerId = getActiveCustomerId(sp);
                  const q = new URLSearchParams();
                  if (customerId) q.set("customerId", customerId);
                  startTransition(() =>
                    router.push(`/customer/vault/transactions?${q.toString()}`)
                  );
                }}
                className="text-[12px] text-gray-600 underline"
              >
                See all
              </button>
            </div>
          </div>

          {/* Recent Transactions list (tick icon) */}
          <div className="px-4 mt-2">
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              {txLoading ? (
                <div className="py-10 flex items-center justify-center">
                  <LogoSpinner className="w-5 h-5" />
                </div>
              ) : txs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Image
                    src="/uploads/Empty State.png"
                    alt="No transactions yet"
                    width={200}
                    height={200}
                    className="w-40 h-40 object-contain"
                    priority
                  />
                  <p className="mt-3 text-sm text-gray-500">
                    No transactions yet.
                  </p>
                </div>
              ) : (
                txs.map((t, i) => (
                  <div
                    key={t.id}
                    className={`flex items-center justify-between px-3 py-3 ${
                      i !== txs.length - 1 ? "border-b border-gray-100" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          t.isCredit ? "bg-emerald-50" : "bg-rose-50"
                        }`}
                      >
                        <Check
                          className={`w-4 h-4 ${
                            t.isCredit ? "text-emerald-700" : "text-rose-700"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {t.note}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {new Date(t.at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-[13px] font-semibold ${
                        t.isCredit ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {NGN(t.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom actions */}
          <div className="sticky bottom-0 mt-6 bg-white px-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => openPicker("withdraw")}
                className="h-12 rounded-2xl font-semibold bg-gray-100 text-rose-600"
              >
                Withdraw
              </button>
              <button
                onClick={() => openPicker("deposit")}
                className="h-12 rounded-2xl font-semibold bg-black text-white"
              >
                Deposit
              </button>
            </div>
          </div>
        </div>

        {/* ===== Vault Picker Modal (Deposit / Withdraw) ===== */}
        {pickerOpen && (
          <div className="fixed inset-0 z-50">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPickerOpen(false)}
            />
            {/* sheet */}
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />

              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Choose Preferred Vault
              </h3>

              {/* Error / Loading / Real list */}
              {vaultsErr && (
                <p className="text-[12px] text-rose-600 mb-3">{vaultsErr}</p>
              )}

              {vaultsLoading ? (
                <>
                  <div className="mb-3 text-xs text-gray-600 inline-flex items-center gap-2">
                    <LogoSpinner className="w-3.5 h-3.5" />
                    Loading vaults…
                  </div>
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-20 rounded-xl bg-gray-50 animate-pulse"
                      />
                    ))}
                  </div>
                </>
              ) : vaults.length === 0 ? (
                <p className="text-sm text-gray-500">No vaults yet.</p>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                  {vaults.map((v) => {
                    const progress = v.target
                      ? Math.min(100, Math.round((v.balance / v.target) * 100))
                      : 0;
                    const isActive = selectedVaultId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVaultId(v.id)}
                        className={`w-full text-left rounded-xl border p-3 bg-white flex items-center gap-3 ${
                          isActive ? "border-black" : "border-gray-200"
                        }`}
                      >
                        <div className="shrink-0">
                          <Image
                            src="/uploads/Little wheel personal vault bw 1.png"
                            alt="Vault"
                            width={56}
                            height={56}
                            className="w-12 h-12 object-contain"
                            priority
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                            {v.name}
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Amount: <strong>{NGN(v.daily)}</strong> (DAILY)
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: "#10B981",
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-600">
                              {isFinite(progress) ? progress : 0}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[12px] font-semibold">
                          <span className="text-red-600">{NGN(v.balance)}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-green-600">
                            {NGN(v.target)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={proceed}
                disabled={!selectedVaultId}
                className={`mt-4 w-full h-12 rounded-2xl font-semibold ${
                  selectedVaultId
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Select and Proceed
              </button>

              <button
                onClick={() => {
                  const customerId = getActiveCustomerId(sp);
                  setPickerOpen(false);
                  startTransition(() => {
                    if (customerId) {
                      router.push(
                        `/customer/vault/create?customerId=${encodeURIComponent(
                          customerId
                        )}`
                      );
                    } else {
                      router.push("/customer/vault/create");
                    }
                  });
                }}
                className="mt-3 w-full text-center text-[13px] font-semibold text-black underline"
              >
                Create New Vault
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ================= Wrapper with Suspense ================= */

export default function PersonalVaultCustomerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PersonalVaultCustomerPageInner />
    </Suspense>
  );
}
