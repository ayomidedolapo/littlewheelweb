/* app/customer/vault/transaction-details/page.tsx */
"use client";

import { Suspense } from "react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Share2 } from "lucide-react";
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

/** Convert URL -> data URL (best effort) */
async function urlToDataUrl(url: string): Promise<string | null> {
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

/** Inline <img> sources (in a cloned node) so the SVG is self-contained */
async function inlineNodeImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src");
      if (!src) return;
      if (/^data:/.test(src)) return;
      const data = await urlToDataUrl(src);
      if (data) {
        img.setAttribute("src", data);
        img.removeAttribute("srcset");
      } else {
        (img as HTMLImageElement).style.display = "none";
      }
    })
  );
}

/** Manual foreignObject renderer → returns a PNG Blob */
async function renderForeignObjectPNG(el: HTMLElement): Promise<{ blob: Blob | null; dataUrl?: string } > {
  const rect = el.getBoundingClientRect();
  const dpr = Math.max(2, window.devicePixelRatio || 2);
  const width = Math.ceil(rect.width * dpr);
  const height = Math.ceil(rect.height * dpr);

  const node = el.cloneNode(true) as HTMLElement;
  node.style.margin = "0";
  node.style.transform = `scale(${dpr})`;
  node.style.transformOrigin = "top left";
  node.style.width = `${rect.width}px`;
  node.style.height = `${rect.height}px`;

  await inlineNodeImages(node);

  const xml = new XMLSerializer().serializeToString(node);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <foreignObject x="0" y="0" width="${width}" height="${height}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${rect.width}px;height:${rect.height}px;overflow:hidden;background:transparent;">
      ${xml}
    </div>
  </foreignObject>
</svg>`.trim();

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.decoding = "sync";
      i.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: null };
    // Do not prefill; keep canvas transparent
    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Cross-origin checks for <img> nodes (to avoid canvas tainting) */
function isCrossOriginUrl(src?: string | null) {
  if (!src) return false;
  if (/^data:/.test(src)) return false;
  try {
    const u = new URL(src, location.href);
    return u.origin !== location.origin;
  } catch {
    return true;
  }
}

/** Turn dataURL into Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/data:(.*?)(;base64)?$/)?.[1] || "application/octet-stream";
  const bstr = atob(parts[1] || "");
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

/** Cross-browser save helper (iOS opens new tab with dataURL) */
function savePNG(filename: string, blob: Blob, dataUrl?: string) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    const openUrl = dataUrl || URL.createObjectURL(blob);
    const win = window.open(openUrl, "_blank", "noopener");
    if (!win) {
      // silent fail—no alert
      console.warn("Popup blocked. User can try again.");
    }
    if (!dataUrl) setTimeout(() => URL.revokeObjectURL(openUrl), 1000);
    return;
  }

  // @ts-ignore IE legacy
  if (window.navigator && window.navigator.msSaveOrOpenBlob) {
    // @ts-ignore
    return window.navigator.msSaveOrOpenBlob(blob, filename);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
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

  /* ---------- Download: prefer html2canvas (cleaner rasterization) with clean mode;
        fall back to dom-to-image-more and manual foreignObject if needed. ---------- */

  const waitForPaint = async () => {
    try {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    } catch {}
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );
  };

  // Capture helper using html2canvas to reduce hairline/grid artifacts
  const captureWithHtml2Canvas = async (el: HTMLElement): Promise<string> => {
    const html2canvas = (await import("html2canvas")).default;
    const dpr = Math.max(4, Math.ceil(window.devicePixelRatio || 2));
    const dataUrl = await html2canvas(el, {
      useCORS: true,
      backgroundColor: null,
      scale: dpr,
      foreignObjectRendering: true,
      logging: false,
      onclone: (doc) => {
        const root = doc.getElementById("receipt-capture");
        if (root) root.setAttribute("data-clean", "1");
      },
      ignoreElements: (node: Element) => (
        (node as HTMLElement).dataset?.noCapture === "1" ||
        (node as HTMLElement).classList?.contains("fixed")
      ),
    }).then((canvas) => canvas.toDataURL("image/png"));
    return dataUrl;
  };

  // Temporarily toggle a "clean" style (no borders/shadows/dividers) for capture only
  const withCleanCapture = async <T,>(fn: () => Promise<T>) => {
    const el = document.getElementById("receipt-capture");
    if (!el) return await fn();
    el.setAttribute("data-clean", "1");
    try {
      return await fn();
    } finally {
      el.removeAttribute("data-clean");
    }
  };

  const handleError = (e: any, label: string) => {
    console.error(`[${label}]`, e);
    alert(`${label} failed. Check console for details.`);
  };

  const downloadAsPNG = async () => {
    const el = document.getElementById("receipt-capture") as HTMLElement | null;
    if (!el) return;
    await waitForPaint();

    await withCleanCapture(async () => {
      // Primary: html2canvas (clean and consistent)
      try {
        const pngDataUrl = await captureWithHtml2Canvas(el);
        const blob = dataUrlToBlob(pngDataUrl);
        savePNG(`transaction-${tx?.id || "receipt"}.png`, blob, pngDataUrl);
        return;
      } catch (e) {
        console.warn("[PNG] html2canvas failed, trying dom-to-image-more.", e);
      }

      // Fallback: dom-to-image-more
      try {
        const domtoimage = (await import("dom-to-image-more")).default;

        const pngDataUrl = await domtoimage.toPng(el, {
          cacheBust: true,
          quality: 1,
          // no bgcolor => keep transparency
          bgcolor: undefined,
          filter(node) {
            if (node instanceof HTMLElement && node.tagName === "IMG") {
              const src = (node as HTMLImageElement).getAttribute("src");
              if (isCrossOriginUrl(src)) return false;
            }
            return true;
          },
          width: el.clientWidth * 2,
          height: el.clientHeight * 2,
          style: {
            transform: "scale(2)",
            transformOrigin: "top left",
            width: `${el.clientWidth}px`,
            height: `${el.clientHeight}px`,
            background: "#ffffff",
          },
        });

        const blob = dataUrlToBlob(pngDataUrl);
        savePNG(`transaction-${tx?.id || "receipt"}.png`, blob, pngDataUrl);
        return;
      } catch (e) {
        console.warn("[PNG] dom-to-image-more failed, using manual fallback.", e);
      }

      // Fallback: foreignObject
      try {
        const { blob, dataUrl } = await renderForeignObjectPNG(el);
        if (!blob) throw new Error("Fallback renderer returned empty blob");
        savePNG(`transaction-${tx?.id || "receipt"}.png`, blob, dataUrl);
      } catch (e) {
        handleError(e, "PNG download");
      }
    });
  };

  const downloadAsPDF = async () => {
    const el = document.getElementById("receipt-capture") as HTMLElement | null;
    if (!el) return;
    await waitForPaint();

    await withCleanCapture(async () => {
      // Primary: html2canvas -> jsPDF
      try {
        const { jsPDF } = await import("jspdf");
        const pngDataUrl = await captureWithHtml2Canvas(el);

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new window.Image();
          i.onload = () => resolve(i);
          i.onerror = (err) => reject(err);
          i.src = pngDataUrl;
        });

        const imgW = img.width;
        const imgH = img.height;
        // Create a page exactly matching the image to avoid resampling/moire
        const pdf = new jsPDF({ orientation: imgW >= imgH ? "l" : "p", unit: "pt", format: [imgW, imgH], compress: true });
        pdf.addImage(pngDataUrl, "PNG", 0, 0, imgW, imgH, undefined, "FAST");
        pdf.save(`transaction-${tx?.id || "receipt"}.pdf`);
        return;
      } catch (e) {
        console.warn("[PDF] html2canvas failed, trying dom-to-image-more.", e);
      }

      // Fallback: dom-to-image-more -> jsPDF
      try {
        const domtoimage = (await import("dom-to-image-more")).default;
        const { jsPDF } = await import("jspdf");
        
        const pngDataUrl = await domtoimage.toPng(el, {
          cacheBust: true,
          quality: 1,
          bgcolor: undefined,
          filter(node) {
            if (node instanceof HTMLElement && node.tagName === "IMG") {
              const src = (node as HTMLImageElement).getAttribute("src");
              if (isCrossOriginUrl(src)) return false;
            }
            return true;
          },
          width: el.clientWidth * 2,
          height: el.clientHeight * 2,
          style: {
            transform: "scale(2)",
            transformOrigin: "top left",
            width: `${el.clientWidth}px`,
            height: `${el.clientHeight}px`,
            background: "#ffffff",
          },
        });

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new window.Image();
          i.onload = () => resolve(i);
          i.onerror = (err) => reject(err);
          i.src = pngDataUrl;
        });

        const imgW = img.width;
        const imgH = img.height;
        const pdf = new jsPDF({ orientation: imgW >= imgH ? "l" : "p", unit: "pt", format: [imgW, imgH], compress: true });
        pdf.addImage(pngDataUrl, "PNG", 0, 0, imgW, imgH, undefined, "FAST");
        pdf.save(`transaction-${tx?.id || "receipt"}.pdf`);
        return;
      } catch (e) {
        console.warn("[PDF] dom-to-image-more failed, using manual fallback.", e);
      }

      // Fallback: foreignObject -> jsPDF
      try {
        const { jsPDF } = await import("jspdf");
        const { blob, dataUrl } = await renderForeignObjectPNG(el);
        if (!blob) throw new Error("Fallback renderer returned empty blob");
        const pngUrl = dataUrl || URL.createObjectURL(blob);

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new window.Image();
          i.onload = () => resolve(i);
          i.onerror = (err) => reject(err);
          i.src = pngUrl;
        });

        const imgW = img.width;
        const imgH = img.height;
        const pdf = new jsPDF({ orientation: imgW >= imgH ? "l" : "p", unit: "pt", format: [imgW, imgH], compress: true });
        pdf.addImage(pngUrl, "PNG", 0, 0, imgW, imgH, undefined, "FAST");
        pdf.save(`transaction-${tx?.id || "receipt"}.pdf`);
        if (!dataUrl) URL.revokeObjectURL(pngUrl);
      } catch (e) {
        handleError(e, "PDF download");
      }
    });
  };

  const shareReceipt = async () => {
    if (!tx) return;
    const text = `${tx.isCredit ? "Deposit" : "Withdrawal"} • ${
      tx.ref ? `Ref ${tx.ref} • ` : ""
    }${NGN(tx.amount)} on ${dtPretty(tx.at)}`;
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Little Wheel Receipt", text });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
      alert("Receipt text copied to clipboard.");
    }
  };

  const goBackToTransactions = () => {
    const cid = customerId || "";
    startTransition(() =>
      router.replace(
        `/customer/vault/transactions${
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
      {/* Capture CSS: remove white/filled backgrounds; keep only content (text/images) */}
      <style jsx global>{`
        #receipt-capture[data-clean="1"] { background: transparent !important; }
        #receipt-capture[data-clean="1"] .bg-frame { display: none !important; }
        #receipt-capture[data-clean="1"] .capture-border,
        #receipt-capture[data-clean="1"] .capture-divider { border-color: transparent !important; }
        /* Neutralize common Tailwind background fills within the receipt */
        #receipt-capture[data-clean="1"] .bg-white,
        #receipt-capture[data-clean="1"] .bg-white\/80,
        #receipt-capture[data-clean="1"] .bg-gray-50,
        #receipt-capture[data-clean="1"] .bg-gray-100,
        #receipt-capture[data-clean="1"] .bg-gray-200,
        #receipt-capture[data-clean="1"] .bg-rose-50,
        #receipt-capture[data-clean="1"] .bg-emerald-50 { background-color: transparent !important; }
        /* If any element still paints via background shorthand */
        #receipt-capture[data-clean="1"] * { background-image: none !important; }
        /* Remove Tailwind ring (box-shadow based) and outlines during capture */
        #receipt-capture[data-clean="1"] *,
        #receipt-capture[data-clean="1"] *:before,
        #receipt-capture[data-clean="1"] *:after {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

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
            {/* Receipt area — center it perfectly on all widths */}
            <div className="relative px-2">
              <div
                id="receipt-capture"
                ref={receiptRef}
                className="relative w-full max-w-[600px] mx-auto rounded-[28px] overflow-hidden min-h-[620px] p-4 md:p-6"
              >
                {/* Background shape — fully visible & CORS-friendly */}
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
                    <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-gray-200 bg-gray-100 capture-border">
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

                  <div className="mt-4 border-t border-gray-200 capture-divider" />

                  {/* Amount chips + amounts */}
                  <div className="mt-4 grid grid-cols-2 gap-3 items-center">
                    <div>
                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold text-rose-700 border-rose-300 bg-rose-50 capture-border">
                        {tx.isCredit ? "Amount Deposited" : "Amount Withdrawn"}
                      </span>
                    </div>
                    <div className="text-right text-rose-600 font-bold text-lg">
                      {tx.isCredit ? "" : "−"}
                      {NGN(tx.amount)}
                    </div>

                    <div>
                      <span className="inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold text-emerald-700 border-emerald-300 bg-emerald-50 capture-border">
                        New Balance
                      </span>
                    </div>
                    <div className="text-right text-emerald-600 font-bold text-lg">
                      {NGN(tx.newBalance ?? 0)}
                    </div>
                  </div>

                  {/* Meta grid */}
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3 capture-border capture-shadow">
                      <p className="text-[11px] text-gray-500">Customer Name</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {tx.customerName || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3 capture-border capture-shadow">
                      <p className="text-[11px] text-gray-500">
                        Time &amp; Date
                      </p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {dtPretty(tx.at)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3 capture-border capture-shadow">
                      <p className="text-[11px] text-gray-500">Ref No,</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5 break-all">
                        {tx.ref || "—"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white/80 p-3 capture-border capture-shadow">
                      <p className="text-[11px] text-gray-500">Agent Name</p>
                      <p className="text-[13px] font-semibold text-gray-900 mt-0.5">
                        {tx.agentName || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Logo inside Subtract — inverted (white -> black) */}
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
                    setTimeout(downloadAsPNG, 50);
                  }}
                  className="w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold"
                >
                  Download as PNG
                </button>
                <button
                  onClick={() => {
                    setShowDownloadSheet(false);
                    setTimeout(downloadAsPDF, 50);
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

/* ---------------- wrapper with Suspense ---------------- */

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F6FA]" />} >
      <TransactionDetailsPageInner />
    </Suspense>
  );
}
