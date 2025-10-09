/* app/customer/vault/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  Plus,
  Eye,
  CheckSquare,
  ChevronRight,
  Check,
} from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------- types ---------- */
type APIVault = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: number;
  amount?: number;
};

type Vault = {
  id: string; // REAL api id used for routing/fetching
  name: string;
  balance: number;
  target: number;
  daily: number;
};

type Tx = {
  id: string;
  note: string;
  amount: number;
  at: string;
  isCredit: boolean;
};

/* ---------- utils ---------- */
const formatNGN = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeSafeSlug = (name: string, id: string) => {
  const base = slugify(name || "vault");
  const tail =
    (id || "")
      .toString()
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-6) || "x";
  return `${base}-${tail}`;
};

const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

/* ------- state helpers ------- */
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

/** Try cookie first (browser), then localStorage */
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

/** fetch wrapper that auto-adds x-lw-auth when present */
async function apiGet(url: string, token: string, signal?: AbortSignal) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers["x-lw-auth"] = token;
  const r = await fetch(url, { headers, cache: "no-store", signal });
  return r;
}

/* ============================ Page ============================ */
export default function CustomerVaultPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // routing spinner
  const [isRouting, startTransition] = useTransition();
  const routePush = (href: string) => startTransition(() => router.push(href));

  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [txs, setTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState<boolean>(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [flow, setFlow] = useState<"deposit" | "withdraw">("deposit");
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  // stable token
  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }

  const openPicker = (mode: "deposit" | "withdraw") => {
    setFlow(mode);
    setSelectedVaultId(null);
    setPickerOpen(true);
  };

  const proceed = () => {
    if (!selectedVaultId) return;
    setPickerOpen(false);

    const customerId = getActiveCustomerId(sp);
    const q = new URLSearchParams();
    if (customerId) q.set("customerId", customerId);
    q.set("vaultId", selectedVaultId);

    routePush(
      flow === "deposit"
        ? `/customer/vault/deposit?${q.toString()}`
        : `/customer/vault/withdraw?${q.toString()}`
    );
  };

  const pushWithCustomer = (path: string) => {
    const customerId = getActiveCustomerId(sp);
    const q = customerId ? `?customerId=${customerId}` : "";
    routePush(`${path}${q}`);
  };

  const pushVaultDetail = (v: Vault) => {
    const customerId = getActiveCustomerId(sp);
    const q = new URLSearchParams();
    if (customerId) q.set("customerId", customerId);
    q.set("vaultId", v.id);
    const slug = makeSafeSlug(v.name, v.id);
    routePush(`/customer/vault/${encodeURIComponent(slug)}?${q.toString()}`);
  };

  const extractArray = (payload: any): any[] => {
    const d = payload?.data ?? payload;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.items)) return d.items;
    if (Array.isArray(d?.records)) return d.records;
    if (Array.isArray(d?.vaults)) return d.vaults;
    if (Array.isArray(d?.content)) return d.content;
    if (Array.isArray(d?.data)) return d.data;
    return [];
  };

  /* --------- on mount: persist scoped customer --------- */
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

  /* --------- load balance + vault list (parallel) ---------- */
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) {
      setLoading(false);
      setError("Missing customerId (query or session).");
      return;
    }

    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const token = tokenRef.current;

        const balUrl = `/api/v1/agent/customers/${customerId}/vaults/balance`;
        const listUrl = `/api/v1/agent/customers/${customerId}/vaults?status=ONGOING`;

        const [balRes, listRes] = await Promise.all([
          apiGet(balUrl, token, signal),
          apiGet(listUrl, token, signal),
        ]);

        if (!balRes.ok) throw new Error(`Balance HTTP ${balRes.status}`);
        if (!listRes.ok) throw new Error(`Vaults HTTP ${listRes.status}`);

        const [balJ, listJ] = await Promise.all([
          balRes.json(),
          listRes.json(),
        ]);

        const bal = Number(balJ?.data?.balance ?? balJ?.balance ?? 0);
        setTotalBalance(Number.isFinite(bal) ? bal : 0);

        const apiVaults = extractArray(listJ);

        // Per-vault detail loads (limited concurrency)
        const toVault = async (v: APIVault): Promise<Vault> => {
          const apiId = v.id || v.vaultId || v._id || "";
          let detail: any = {};
          if (apiId) {
            try {
              const vr = await apiGet(
                `/api/v1/agent/customers/${customerId}/vaults/${apiId}`,
                token,
                signal
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
            id: apiId || `${customerId}:${slugify(v.name || "personal-vault")}`,
            name: v.name || detail?.name || "Personal Vault",
            balance: currentBalance,
            target: Number(v.targetAmount ?? detail?.targetAmount ?? 0) || 0,
            daily: Number(v.amount ?? detail?.amount ?? 0) || 0,
          };
        };

        // Cap concurrency to avoid flooding (simple chunking)
        const chunkSize = 6;
        const chunks: APIVault[][] = [];
        for (let i = 0; i < apiVaults.length; i += chunkSize) {
          chunks.push(apiVaults.slice(i, i + chunkSize));
        }
        const enriched: Vault[] = [];
        for (const chunk of chunks) {
          const part = await Promise.all(
            chunk.map((v: APIVault) => toVault(v))
          );
          enriched.push(...part);
        }

        setVaults(enriched);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load vaults.");
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- load recent contributions (transactions) ---- */
  useEffect(() => {
    const customerId = getActiveCustomerId(sp);
    if (!customerId) return;

    const ac = new AbortController();
    const { signal } = ac;

    (async () => {
      try {
        setTxLoading(true);
        const res = await apiGet(
          `/api/v1/agent/customers/${customerId}/vaults/contributions`,
          tokenRef.current,
          signal
        );
        if (!res.ok) throw new Error(`Contributions HTTP ${res.status}`);
        const j = await res.json();
        const rows = extractArray(j);

        const mapped: Tx[] = (rows || []).map((r: any, idx: number) => {
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
          const isCredit = type.includes("CREDIT") || type.includes("DEPOSIT");
          const note =
            r.note || r.description || (isCredit ? "Saved" : "Withdrawal");

          return {
            id,
            note,
            amount: Math.abs(amount),
            at: new Date(created).toISOString(),
            isCredit,
          };
        });

        mapped.sort(
          (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
        );

        setTxs(mapped);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setTxs([]);
      } finally {
        setTxLoading(false);
      }
    })();

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => totalBalance, [totalBalance]);
  const withdrawable = useMemo(() => Math.max(total - 1000, 0), [total]); // business rule placeholder

  const navDisabled = isRouting;

  return (
    <>
      {/* ✅ Global route spinner (same pattern) */}
      <LogoSpinner show={isRouting} />

      <div
        className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4"
        aria-busy={isRouting}
      >
        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={() => startTransition(() => router.back())}
              className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
              disabled={navDisabled}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {/* HERO */}
          <div className="px-4 relative">
            <div
              className="relative rounded-2xl bg-black text-white p-5 overflow-hidden pb-8"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 1px, transparent 64px)",
              }}
            >
              <button
                onClick={() => pushWithCustomer("/customer/vault/create")}
                className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-white disabled:opacity-60"
                disabled={navDisabled}
              >
                Add new <Plus className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1 text-[12px] text-white/85 mb-1">
                <span>Total Balance</span>
                <Eye className="h-3.5 w-3.5 opacity-80" />
              </div>
              <div className="text-[28px] leading-none font-extrabold tracking-tight mb-6">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <LogoSpinner show={true} className="w-5 h-5" />
                    Loading…
                  </span>
                ) : (
                  formatNGN(total)
                )}
              </div>

              <div className="mb-6">
                <div className="inline-flex items-center rounded-full border border-white/10 bg-[#2A3F5D]/90 px-3 py-1 text-[12px] shadow-sm">
                  <span className="opacity-95">Withdrawable Amount:&nbsp;</span>
                  <span className="font-semibold">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <LogoSpinner show={true} className="w-4 h-4" />…
                      </span>
                    ) : (
                      formatNGN(withdrawable)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* action buttons */}
            <div className="absolute bottom-[-1px] left-1/2 transform -translate-x-1/2  w-[86%] z-10">
              <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border h-[56px] border-gray-200 bg-white text-gray-900 shadow-lg">
                <button
                  onClick={() => openPicker("deposit")}
                  className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold hover:bg-black/5 disabled:opacity-60"
                  disabled={navDisabled}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-xs font-bold">
                    +
                  </span>
                  Deposit
                </button>
                <button
                  onClick={() => openPicker("withdraw")}
                  className="flex items-center justify-center gap-2 border-l border-gray-200 py-3 text-[13px] font-semibold hover:bg-black/5 disabled:opacity-60"
                  disabled={navDisabled}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-black text-white">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </span>
                  Withdraw
                </button>
              </div>
            </div>

            <div className="h-6" />
          </div>

          {/* Personal Vaults */}
          <div className="px-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-gray-900">
                Personal Vaults
              </h2>
              <button
                onClick={() =>
                  pushWithCustomer("/customer/vault/vault-details")
                }
                className="text-[12px] text-gray-600 inline-flex items-center gap-1 disabled:opacity-60"
                disabled={navDisabled}
              >
                See all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}

            {loading ? (
              <div className="px-1 py-6 flex items-center justify-center">
                <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <LogoSpinner show={true} className="w-5 h-5" />
                  Loading vaults…
                </span>
              </div>
            ) : vaults.length === 0 ? (
              <p className="text-sm text-gray-500">No vaults yet.</p>
            ) : (
              <div className="space-y-3">
                {vaults.map((v) => {
                  const pct = v.target
                    ? Math.min(
                        100,
                        Math.max(0, Math.round((v.balance / v.target) * 100))
                      )
                    : 0;
                  return (
                    <button
                      key={v.id}
                      onClick={() => pushVaultDetail(v)}
                      aria-label={`Open ${v.name}`}
                      className="w-full text-left flex items-stretch gap-3 rounded-xl border border-gray-200 p-3 bg-white hover:bg-gray-50 transition disabled:opacity-60"
                      disabled={navDisabled}
                    >
                      <div className="shrink-0 flex items-center justify-center h-16 w-16">
                        <Image
                          src="/uploads/Little wheel personal vault bw 1.png"
                          alt="Vault"
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                          priority
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                            {v.name}
                          </p>
                          <p className="text-[12px] leading-tight">
                            <span className="font-bold text-red-600">
                              {formatNGN(v.balance)}
                            </span>
                            <span className="text-gray-400 font-normal">
                              /{formatNGN(v.target)}
                            </span>
                          </p>
                        </div>

                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Savings: {formatNGN(v.daily)} daily
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-gray-600">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions (live from contributions) */}
          <div className="px-4 mt-5 pb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[13px] font-semibold text-gray-900">
                Recent Transactions
              </h2>
              <button
                onClick={() => pushWithCustomer("/customer/vault/transactions")}
                className="text-[12px] text-gray-600 inline-flex items-center gap-1 disabled:opacity-60"
                disabled={navDisabled}
              >
                See all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {txLoading ? (
                <div className="px-3 py-4 flex items-center justify-center">
                  <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <LogoSpinner show={true} className="w-5 h-5" />
                    Loading transactions…
                  </span>
                </div>
              ) : txs.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500">
                  No transactions yet.
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
                        className={`h-8 w-8 rounded-full ${
                          t.isCredit ? "bg-emerald-50" : "bg-rose-50"
                        } flex items-center justify-center`}
                      >
                        <Check
                          className={`w-4 h-4 ${
                            t.isCredit ? "text-emerald-600" : "text-rose-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">
                          {t.note}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {fmtDateTime(t.at)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-[13px] font-semibold ${
                        t.isCredit ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {t.isCredit ? "+" : "-"}
                      {formatNGN(t.amount)}
                    </div>
                  </div>
                ))
              )}
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
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />

              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Choose Preferred Vault
              </h3>

              <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                {vaults.map((v) => {
                  const pct = v.target
                    ? Math.min(
                        100,
                        Math.max(0, Math.round((v.balance / v.target) * 100))
                      )
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
                          className="w-14 h-14 object-contain"
                          priority
                        />
                      </div>

                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                          {v.name}
                        </p>
                        <p className="text-[11px] text-gray-600">
                          Amount: <strong>{formatNGN(v.daily)}</strong> (DAILY)
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: "#10B981",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-gray-600">
                            {pct}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[12px] font-semibold">
                        <span className="text-red-600">
                          {formatNGN(v.balance)}
                        </span>
                        <span className="text-gray-400">/</span>
                        <span className="text-green-600">
                          {formatNGN(v.target)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* CTA */}
              <button
                onClick={proceed}
                disabled={!selectedVaultId || navDisabled}
                className={`mt-4 w-full h-12 rounded-2xl font-semibold ${
                  selectedVaultId && !navDisabled
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Select and Proceed
              </button>

              <button
                onClick={() => {
                  setPickerOpen(false);
                  pushWithCustomer("/customer/vault/create");
                }}
                className="mt-3 w-full text-center text-[13px] font-semibold text-black underline disabled:opacity-60"
                disabled={navDisabled}
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
