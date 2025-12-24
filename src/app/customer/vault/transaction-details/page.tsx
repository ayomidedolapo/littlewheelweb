/* app/customer/vault/transaction-details/page.tsx */
"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

/* ---------------- helpers ---------------- */

const NGN = (v?: number) =>
  `₦${Number(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dtPretty = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
};

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
  if (Array.isArray(d?.content)) return d.content;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

/** Prefer cookie → localStorage for auth token */
function getAuthToken(): string {
  if (typeof document === "undefined") return "";
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

/** Shorten long IDs like UUIDs for display (e.g., e706…7b04) */
function shortId(id?: string, head = 4, tail = 4) {
  if (!id) return "";
  const s = String(id);
  if (s.length <= head + tail) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/* ---------------- types ---------------- */

type Tx = {
  id: string;
  at: string; // ISO
  isCredit: boolean;
  amount: number;
  ref?: string;

  customerName?: string;
  agentName?: string;
  avatarUrl?: string | null;

  newBalance?: number | null;
  vaultId?: string | null;
};

/* ---------------- component ---------------- */

function TransactionDetailsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const [isRouting, startTransition] = useTransition();
  const receiptRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<Tx | null>(null);
  const [error, setError] = useState<string | null>(null);

  // stable token
  const tokenRef = useRef<string>("");
  if (!tokenRef.current && typeof window !== "undefined") {
    tokenRef.current = getAuthToken();
  }
  const token = tokenRef.current;

  const customerId = getActiveCustomerId(sp) || "";
  const txId = sp.get("txId") || "";
  const qAmount = Number(sp.get("amount") || "0");
  const qType = (sp.get("type") || "").toUpperCase(); // CREDIT/DEBIT
  const qAt = sp.get("at") || "";
  const qRef =
    sp.get("ref") ||
    sp.get("reference") ||
    sp.get("transactionReference") ||
    undefined;
  const qVaultId = sp.get("vaultId") || null;

  /* ---------- bootstrap: fetch + map ---------- */
  useEffect(() => {
    if (!customerId) {
      setError("Missing customerId.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const headers = token ? { "x-lw-auth": token } : undefined;

        // 1) CUSTOMER (for name/avatar & referredBy -> Ref No)
        let customer: any = {};
        try {
          const rc = await fetch(`/api/v1/agent/customers/${customerId}`, {
            cache: "no-store",
            headers,
          });
          if (rc.ok) {
            const jc = await rc.json().catch(() => ({}));
            customer = jc?.data ?? jc ?? {};
          }
        } catch {}

        const refShort = customer?.referredBy
          ? shortId(customer.referredBy)
          : undefined;

        // 2) Contributions: find tx by id or reference
        let found: any | null = null;
        try {
          const res = await fetch(
            `/api/v1/agent/customers/${customerId}/vaults/contributions`,
            {
              cache: "no-store",
              headers,
            }
          );
          if (res.ok) {
            const j = await res.json().catch(() => ({}));
            const rows = extractArray(j);

            const tryMatch = (pred: (r: any) => boolean) =>
              rows.find(pred) ?? null;

            found =
              tryMatch(
                (r: any) =>
                  String(r?.id ?? r?._id ?? r?.txId ?? r?.reference) === txId
              ) ||
              (qRef
                ? tryMatch(
                    (r: any) =>
                      String(
                        r?.reference ??
                          r?.transactionReference ??
                          r?.ref ??
                          r?.txRef
                      ) === qRef
                  )
                : null);
          }
        } catch {}

        // 3) Map TX
        const mapped: Tx = found
          ? {
              id:
                found.id ||
                found._id ||
                found.txId ||
                found.reference ||
                txId ||
                "tx",
              at: new Date(
                found.createdAt || found.date || found.at || Date.now()
              ).toISOString(),
              amount: Math.abs(
                Number(
                  found.amount ?? found.value ?? found.contribution ?? 0
                ) || 0
              ),
              isCredit: (() => {
                const t = String(
                  found.type || found.direction || found.kind || "CREDIT"
                ).toUpperCase();
                return (
                  t.includes("CREDIT") ||
                  t.includes("DEPOSIT") ||
                  t.includes("TOPUP")
                );
              })(),
              ref:
                refShort ||
                found.reference ||
                found.transactionReference ||
                found.ref ||
                found.txRef ||
                found.txReference ||
                found.transactionId ||
                found?.meta?.reference ||
                qRef ||
                undefined,
              customerName:
                found.customerName ||
                found.customer?.fullName ||
                found.customer?.name ||
                `${customer?.firstName || ""} ${
                  customer?.lastName || ""
                }`.trim() ||
                undefined,
              agentName: found.agentName || found.agent?.name || undefined,
              avatarUrl:
                found.customer?.avatarUrl ||
                found.customer?.profileImageUrl ||
                customer?.avatarUrl ||
                customer?.profileImageUrl ||
                null,
              newBalance: Number(
                found.balanceAfter ??
                  found.newBalance ??
                  found.currentBalance ??
                  found.balance ??
                  NaN
              ),
              vaultId:
                found.vaultId || found.vault_id || found.vault?.id || qVaultId,
            }
          : {
              id: txId || "tx",
              at: qAt || new Date().toISOString(),
              amount: Math.abs(qAmount) || 0,
              isCredit: qType ? qType === "CREDIT" : true,
              ref: refShort || qRef,
              customerName:
                `${customer?.firstName || ""} ${
                  customer?.lastName || ""
                }`.trim() || undefined,
              agentName: undefined,
              avatarUrl:
                customer?.avatarUrl || customer?.profileImageUrl || null,
              newBalance: undefined,
              vaultId: qVaultId,
            };

        // 4) Authoritative NEW BALANCE (customer-specific)
        try {
          const rb = await fetch(
            `/api/v1/agent/customers/${customerId}/vaults/balance`,
            { cache: "no-store", headers }
          );
          if (rb.ok) {
            const jb = await rb.json().catch(() => ({}));
            const nbRaw =
              jb?.balance ??
              jb?.total ??
              jb?.data?.balance ??
              jb?.data?.total ??
              null;

            if (
              nbRaw !== undefined &&
              nbRaw !== null &&
              !Number.isNaN(Number(nbRaw))
            ) {
              mapped.newBalance = Number(nbRaw);
            }
          }
        } catch {}

        if (!cancelled) setTx(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = useMemo(
    () => (tx?.isCredit ? "Deposit Successful!" : "Withdrawal Successful!"),
    [tx?.isCredit]
  );
  const caption = useMemo(
    () =>
      `Your ${
        tx?.isCredit ? "deposit" : "withdrawal"
      } has been successfully done.`,
    [tx?.isCredit]
  );

  const goBackToTransactions = () => {
    const cid = customerId || "";
    startTransition(() =>
      router.replace(
        `/customer/vault${
          cid ? `?customerId=${encodeURIComponent(cid)}` : ""
        }`
      )
    );
  };

  /* ---------------- UI (centered & responsive) ---------------- */

  return (
    <div
      className="min-h-screen bg-[#F4F6FA] flex items-start justify-center"
      aria-busy={isRouting}
    >
      <LogoSpinner show={isRouting} />

      <div className="w-full max-w-[500px] min-h-screen bg-[#F4F6FA] mt-10 md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {loading || !tx ? (
          <div className="px-4">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <LogoSpinner className="w-4 h-4" />
              Loading…
            </div>
            <div className="h-[560px] rounded-[28px] bg-gray-100 animate-pulse" />
            <div className="h-4" />
            <div className="grid grid-cols-2 gap-3 px-1">
              <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            </div>
            <div className="h-12 mt-3 rounded-2xl bg-gray-200 animate-pulse" />
            {error && (
              <p className="mt-4 text-center text-sm text-rose-600">{error}</p>
            )}
            <div className="h-8" />
          </div>
        ) : (
          <>
            {/* Receipt area — design unchanged */}
            <div className="relative px-2">
              <div
                id="receipt-capture"
                ref={receiptRef}
                className="relative w-full max-w-[600px] mx-auto rounded-[28px] overflow-hidden min-h-[620px] p-4 md:p-6"
              >
                {/* Background shape */}
                <NextImage
                  src="/uploads/Subtract.png"
                  alt=""
                  width={1600}
                  height={1600}
                  className="absolute inset-0 w-full h-full object-contain object-center select-none pointer-events-none bg-frame"
                  priority
                  unoptimized
                  crossOrigin="anonymous"
                />

                {/* Foreground content */}
                <div className="relative z-10 px-4 md:px-5 pt-12 pb-24">
                  {/* Avatar */}
                  <div className="w-full flex justify-center -mt-10 mb-2">
                    <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                      {tx.avatarUrl ? (
                        <NextImage
                          src={tx.avatarUrl}
                          alt="Customer"
                          width={80}
                          height={80}
                          className="h-20 w-20 object-cover"
                          unoptimized
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-20 w-20 bg-gray-200" />
                      )}
                    </div>
                  </div>

                  {/* Title + caption */}
                  <h2 className="text-[18px] md:text-[20px] font-extrabold text-gray-900 text-center">
                    {title}
                  </h2>
                  <p className="text-[13px] text-gray-600 text-center mt-1">
                    {caption}
                  </p>

                  {/* Handle */}
                  <p className="text-base font-semibold text-center mt-2">
                    @ loluss
                  </p>

                  <div className="mt-4 border-t border-gray-200" />

                  {/* Amount chips + amounts */}
                  <div className="mt-4 grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold text-rose-700 border-rose-300 bg-rose-50">
                        {tx.isCredit ? "Amount Deposited" : "Amount Withdrawn"}
                      </span>
                    </div>
                    <div className="text-right text-rose-600 font-bold text-lg">
                      {tx.isCredit ? "" : "−"}
                      {NGN(tx.amount)}
                    </div>

                    <div>
                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50">
                        New Balance
                      </span>
                    </div>
                    <div className="text-right text-emerald-600 font-bold text-lg">
                      {NGN(tx.newBalance ?? 0)}
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
                      <p className="text-[11px] text-gray-500">Customer Name</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {tx.customerName || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
                      <p className="text-[11px] text-gray-500">
                        Time &amp; Date
                      </p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {dtPretty(tx.at)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
                      <p className="text-[11px] text-gray-500">Ref No,</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5 break-all">
                        {tx.ref || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3">
                      <p className="text-[11px] text-gray-500">Agent Name</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {tx.agentName || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Logo inside Subtract */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                    <NextImage
                      src="/uploads/logo.png"
                      alt="Little Wheel"
                      width={120}
                      height={30}
                      className="h-6 w-auto invert"
                      priority
                      unoptimized
                      crossOrigin="anonymous"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshot hint + Done */}
            <div className="px-4 mt-4">
              <p className="text-[11px] text-gray-500 text-center mb-2">
                To save this receipt, take a screenshot on your device.
              </p>

              <button
                onClick={goBackToTransactions}
                className="mt-1 w-full h-12 rounded-2xl bg-black text-white font-semibold"
              >
                Done
              </button>
            </div>

            <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- wrapper with Suspense ---------------- */

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />}>
      <TransactionDetailsPageInner />
    </Suspense>
  );
}
