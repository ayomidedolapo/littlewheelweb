/* app/customer/vault/transaction-details/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Download, Share2 } from "lucide-react";

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

/* ---- tiny util: fetch -> dataURL (best effort) ---- */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ---------------- types ---------------- */

type Tx = {
  id: string;
  at: string; // ISO
  isCredit: boolean; // deposit = true, withdrawal = false
  amount: number;
  ref?: string;

  customerName?: string;
  agentName?: string;
  avatarUrl?: string | null;

  newBalance?: number | null;
  vaultId?: string | null;
};

/* ---------------- component ---------------- */

export default function TransactionDetailsPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // this node is what we capture for PNG/PDF
  const receiptRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [tx, setTx] = useState<Tx | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bottom-sheet for download
  const [showDownloadSheet, setShowDownloadSheet] = useState(false);

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

  /* ---------- bootstrap: fetch from contributions, fall back to query data ---------- */
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

        // Pull customer for fallbacks (avatar/name)
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

        // Pull contributions (customer-wide), then match tx
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
              // capture many possible ref fields
              ref:
                found.reference ||
                found.transactionReference ||
                found.ref ||
                found.txRef ||
                found.txReference ||
                found.transactionId ||
                found?.meta?.reference ||
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
              ref: qRef,
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

  /* ---------- Download helpers (PNG / PDF) ---------- */

  // Render the receipt node to PNG (foreignObject trick) — inline images first.
  const downloadAsPNG = async () => {
    const srcNode = receiptRef.current;
    if (!srcNode) return;

    const node = srcNode.cloneNode(true) as HTMLElement;

    // Inline <img> sources to data URLs to avoid CORS/taint issues
    const imgs = Array.from(node.querySelectorAll("img"));
    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src");
        if (!src) return;
        const data = await toDataUrl(src);
        if (data) {
          img.setAttribute("src", data);
        } else {
          (img as HTMLImageElement).style.display = "none";
        }
      })
    );

    const rect = srcNode.getBoundingClientRect();
    const dpr = Math.max(2, window.devicePixelRatio || 2);
    const width = Math.ceil(rect.width * dpr);
    const height = Math.ceil(rect.height * dpr);

    const xml = new XMLSerializer().serializeToString(node);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject width="100%" height="100%" x="0" y="0">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;zoom:${dpr};">
            ${xml}
          </div>
        </foreignObject>
      </svg>`;

    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `transaction-${tx?.id || "receipt"}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    };
    img.onerror = () => alert("Could not render image (PNG). Try PDF instead.");
    img.src = url;
  };

  // Print-to-PDF (open a clean window, inject node, call print)
  const downloadAsPDF = () => {
    const w = window.open("", "_blank", "popup=true,width=520,height=920");
    if (!w || !receiptRef.current) return;
    w.document.write(`
      <html>
        <head>
          <title>Transaction Receipt</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            *{box-sizing:border-box}
            body{margin:0;background:#fff;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Helvetica,Arial}
            .wrap{max-width:500px;margin:16px auto;padding:0 8px}
            /* Ensure images render in print */
            img{max-width:100%;height:auto}
          </style>
        </head>
        <body>
          <div class="wrap">${receiptRef.current.outerHTML}</div>
        </body>
      </html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  const shareReceipt = async () => {
    if (!tx) return;
    const text = `${tx.isCredit ? "Deposit" : "Withdrawal"} • ${
      tx.ref ? `Ref ${tx.ref} • ` : ""
    }${NGN(tx.amount)} on ${dtPretty(tx.at)}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Little Wheel Receipt",
          text,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      alert("Receipt text copied to clipboard.");
    }
  };

  const goBackToTransactions = () => {
    const cid = customerId || "";
    router.replace(
      `/customer/vault/transactions${
        cid ? `?customerId=${encodeURIComponent(cid)}` : ""
      }`
    );
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-[#F4F6FA] flex items-start justify-center">
      <div className="w-full max-w-[500px] min-h-screen bg-[#F4F6FA] mt-10 md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Skeleton / Error */}
        {loading || !tx ? (
          <div className="px-4">
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
            {/* Receipt on Subtract background ONLY */}
            <div className="relative px-4">
              <div
                ref={receiptRef}
                className="relative mx-auto w-full rounded-[28px] overflow-hidden bg-white"
              >
                {/* Background shape */}
                <Image
                  src="/uploads/Subtract.png"
                  alt=""
                  width={1200}
                  height={1200}
                  className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
                  priority
                />

                {/* Foreground content */}
                <div className="relative z-10 px-5 md:px-6 pt-12 pb-8">
                  {/* Avatar floating over the top curve */}
                  <div className="w-full flex justify-center -mt-10 mb-2">
                    <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100">
                      {tx.avatarUrl ? (
                        <Image
                          src={tx.avatarUrl}
                          alt="Customer"
                          width={80}
                          height={80}
                          className="h-20 w-20 object-cover"
                          unoptimized
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

                  {/* fixed handle (brand handle / id) */}
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

                  {/* Logo at the bottom */}
                  <div className="mt-10 mb-1 flex items-center justify-center">
                    <Image
                      src="/uploads/logo.png"
                      alt="Little Wheel"
                      width={100}
                      height={24}
                      className="h-6 w-auto invert"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions under receipt */}
            <div className="px-4 mt-4">
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setShowDownloadSheet(true)}
                  className="flex-1 h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>

                <button
                  onClick={shareReceipt}
                  className="flex-1 h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              <button
                onClick={goBackToTransactions}
                className="mt-3 w-full h-12 rounded-2xl bg-black text-white font-semibold"
              >
                Done
              </button>
            </div>

            <div className="h-8" />
          </>
        )}

        {/* -------- Download Choice Bottom Sheet -------- */}
        {showDownloadSheet && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowDownloadSheet(false)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Download receipt
              </h3>
              <p className="text-[12px] text-gray-600 mb-4">
                Choose a format to save this receipt.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowDownloadSheet(false);
                    downloadAsPNG();
                  }}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold"
                >
                  Download as PNG
                </button>
                <button
                  onClick={() => {
                    setShowDownloadSheet(false);
                    downloadAsPDF();
                  }}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold"
                >
                  Download as PDF
                </button>
              </div>

              <button
                onClick={() => setShowDownloadSheet(false)}
                className="mt-3 w-full text-center text-[13px] font-semibold text-gray-700 underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
