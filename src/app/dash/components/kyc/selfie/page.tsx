/* src/app/dash/components/kyc/selfie/page.tsx */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera as CameraIcon,
  Lightbulb,
  ScanFace,
  Smile,
  X,
  CheckCircle2,
  XCircle,
  RefreshCcw,
} from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner";

/* ---------- types ---------- */
type SavedBank = {
  bank: { name: string; code?: string | number; logo?: string };
  accountNumber: string;
  accountName: string;
};

type VirtualAccount = {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
};

type MePayloadAny = any;

const isDev = process.env.NODE_ENV !== "production";

/* ---------- small helpers ---------- */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickVirtualAccountFromMePayload(obj: MePayloadAny): VirtualAccount | null {
  if (!obj) return null;

  // Backend shapes can vary:
  // - user.VirtualAccount { name, number, provider }
  // - user.virtualAccount { accountNumber, bankName, accountName }
  // - nested in data.user / data.data / data

  const direct =
    obj.virtualAccount ||
    obj.virtual_account ||
    obj.virtual ||
    obj.VirtualAccount;

  const normalize = (src: any): VirtualAccount | null => {
    if (!src) return null;
    const accountNumber = String(
      src.accountNumber || src.account_number || src.number || ""
    ).trim();
    if (!accountNumber) return null;

    return {
      bankName: src.bankName || src.bank || src.bank_name || src.provider || "",
      accountNumber,
      accountName: src.accountName || src.account_name || src.name || "",
    };
  };

  // 1) direct object
  const d = normalize(direct);
  if (d) return d;

  // 2) arrays
  const arr = obj.accounts || obj.bankAccounts || obj.bank_accounts || [];
  if (Array.isArray(arr)) {
    const v =
      arr.find(
        (a: any) =>
          (a.type || a.kind || a.accountType || "")
            .toString()
            .toLowerCase()
            .includes("virtual") || a.isVirtual === true
      ) || null;
    const n = normalize(v);
    if (n) return n;
  }

  // 3) flat fields
  const num =
    obj.virtualAccountNumber ||
    obj.virtual_account_number ||
    obj.vAccountNumber ||
    obj.accountNumber ||
    obj.number;

  if (num) {
    return {
      bankName:
        obj.virtualBankName ||
        obj.bankName ||
        obj.bank ||
        obj.virtual_bank_name ||
        obj.provider ||
        "",
      accountNumber: String(num).trim(),
      accountName:
        obj.virtualAccountName ||
        obj.accountName ||
        obj.account_name ||
        obj.name ||
        "",
    };
  }

  return null;
}

function unwrapMe(json: any) {
  // Your examples show: { success: true, data: {...}, user: {...} }
  // Some apps return: { user: {...} } or { data: {...} }
  return json?.user || json?.data || json;
}

async function fetchMe(): Promise<any> {
  const res = await fetch("/api/user/me", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!ct.includes("application/json")) {
    throw new Error(
      res.status === 401
        ? "Unauthorized. Please login again."
        : `Unexpected response from /api/user/me (HTTP ${res.status}).`
    );
  }

  let j: any = {};
  try {
    j = JSON.parse(text || "{}");
  } catch {
    // ignore
  }

  if (!res.ok || j?.success === false) {
    throw new Error(j?.message || `Failed to fetch profile (HTTP ${res.status})`);
  }

  return unwrapMe(j);
}

/* ---------- success / failed sheet ---------- */
function ResultSheet(props: {
  open: boolean;
  type: "success" | "failed";
  title: string;
  description?: string;
  va?: VirtualAccount | null;
  onClose?: () => void;
  onPrimary?: () => void;
  onSecondary?: () => void;
  primaryText?: string;
  secondaryText?: string;
  busy?: boolean;
}) {
  const {
    open,
    type,
    title,
    description,
    va,
    onClose,
    onPrimary,
    onSecondary,
    primaryText = "Continue",
    secondaryText = "Try again",
    busy,
  } = props;

  if (!open) return null;

  const Icon = type === "success" ? CheckCircle2 : XCircle;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
      />
      {/* sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5">
        <div className="flex items-start gap-3">
          <span
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
              type === "success" ? "bg-emerald-50" : "bg-rose-50"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${
                type === "success" ? "text-emerald-600" : "text-rose-600"
              }`}
            />
          </span>

          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-extrabold text-gray-900">{title}</p>
            {description && (
              <p className="mt-1 text-[13px] text-gray-600">{description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-gray-100 hover:bg-gray-200 inline-flex items-center justify-center"
            aria-label="Close sheet"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        {/* VA preview (on success) */}
        {type === "success" && va?.accountNumber && (
          <div className="mt-4 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-100">
            <p className="text-[12px] font-semibold text-gray-900">
              Virtual Account
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-[12.5px] text-gray-700">
                <span className="font-semibold">Bank:</span>{" "}
                {va.bankName || "—"}
              </p>
              <p className="text-[12.5px] text-gray-700">
                <span className="font-semibold">Account No:</span>{" "}
                <span className="font-mono tracking-wide">
                  {va.accountNumber}
                </span>
              </p>
              <p className="text-[12.5px] text-gray-700">
                <span className="font-semibold">Name:</span>{" "}
                {va.accountName || "—"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {/* Secondary */}
          <button
            type="button"
            onClick={onSecondary}
            disabled={busy}
            className="h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            {secondaryText}
          </button>

          {/* Primary */}
          <button
            type="button"
            onClick={onPrimary}
            disabled={busy}
            className="h-12 rounded-2xl bg-black hover:bg-black/90 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {primaryText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */
export default function TierTwoSelfiePage() {
  const router = useRouter();

  // pulled from previous step
  const [bvn, setBvn] = useState("");
  const [bank, setBank] = useState<SavedBank | null>(null);

  // camera + capture
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string>(""); // dataURL

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // submit
  const [submitting, setSubmitting] = useState(false);
  const canProceed = !!photo;

  // result sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState<"success" | "failed">("failed");
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetDesc, setSheetDesc] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [vaFound, setVaFound] = useState<VirtualAccount | null>(null);

  // load context from sessionStorage
  useEffect(() => {
    try {
      setBvn(sessionStorage.getItem("tier2_bvn") || "");
      const raw = sessionStorage.getItem("tier2_bank");
      if (raw) setBank(JSON.parse(raw));
    } catch {}
  }, []);

  /* ---------- camera helpers ---------- */
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function closeCamera() {
    const v = videoRef.current;
    if (v) {
      v.onloadedmetadata = null;
      v.oncanplay = null;
      (v as any).srcObject = null;
    }
    setCameraOpen(false);
    setVideoReady(false);
    stopCamera();
  }

  async function openCamera() {
    setError(null);

    if (
      typeof window !== "undefined" &&
      window.isSecureContext !== true &&
      location.protocol !== "https:"
    ) {
      setError("Camera requires HTTPS (or localhost). Open over HTTPS.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not available on this device/browser.");
      return;
    }

    const tries: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: "user" } }, audio: false },
      { video: { facingMode: "user" }, audio: false },
      { video: true, audio: false },
    ];

    let stream: MediaStream | null = null;
    for (const c of tries) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(c);
        break;
      } catch {}
    }
    if (!stream) {
      setError("Couldn’t start camera. Check permissions and try again.");
      return;
    }

    streamRef.current = stream;
    setCameraOpen(true);

    requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      (video as any).playsInline = true;
      (video as any).srcObject = stream!;
      video.muted = true;
      const ready = () => {
        setVideoReady(true);
        video.play().catch(() => {});
      };
      video.onloadedmetadata = ready;
      video.oncanplay = ready;
      if ((video as any).readyState >= 2) ready();
    });
  }

  // capture circular crop (to match UI)
  function captureCircleFromVideo(video: HTMLVideoElement): string {
    const vw = video.videoWidth || 720;
    const vh = video.videoHeight || 1280;

    // make a square crop centered (shorter side)
    const side = Math.min(vw, vh);
    const sx = Math.floor((vw - side) / 2);
    const sy = Math.floor((vh - side) / 2);

    // output size ~ 640x640 for decent quality
    const out = 640;
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(out / 2, out / 2, out / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(video, sx, sy, side, side, 0, 0, out, out);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.88);
  }

  async function onCapture() {
    const video = videoRef.current;
    if (!video || !videoReady) return;
    setProcessing(true);
    try {
      const dataUrl = captureCircleFromVideo(video);
      if (!dataUrl) {
        setError("Couldn’t process the photo.");
        return;
      }
      setPhoto(dataUrl);
      closeCamera();
    } finally {
      setProcessing(false);
    }
  }

  /* ---------- verify VA using /api/user/me ---------- */
  async function verifyVirtualAccount(): Promise<{
    ok: boolean;
    va: VirtualAccount | null;
    rawUser?: any;
  }> {
    // A little retry because VA can be created async on backend
    const tries = [
      { wait: 0 },
      { wait: 900 },
      { wait: 1200 },
      { wait: 1500 },
      { wait: 1800 },
    ];

    for (let i = 0; i < tries.length; i++) {
      if (tries[i].wait) await sleep(tries[i].wait);

      const me = await fetchMe();

      // your payload shows "data.VirtualAccount"
      const va =
        pickVirtualAccountFromMePayload(me) ||
        pickVirtualAccountFromMePayload(me?.user) ||
        pickVirtualAccountFromMePayload(me?.data);

      if (va?.accountNumber) {
        return { ok: true, va, rawUser: me };
      }
    }

    // last read (so we return latest state)
    try {
      const me = await fetchMe();
      const va =
        pickVirtualAccountFromMePayload(me) ||
        pickVirtualAccountFromMePayload(me?.user) ||
        pickVirtualAccountFromMePayload(me?.data);
      return { ok: !!va?.accountNumber, va: va || null, rawUser: me };
    } catch {
      return { ok: false, va: null };
    }
  }

  function openResultSheetSuccess(va: VirtualAccount) {
    setVaFound(va);
    setSheetType("success");
    setSheetTitle("Virtual account created ✅");
    setSheetDesc("Your account is ready. You can start receiving transfers.");
    setSheetOpen(true);

    // auto redirect (shows sheet first)
    setTimeout(() => {
      router.replace("/dash");
    }, 2200);
  }

  function openResultSheetFailed() {
    setVaFound(null);
    setSheetType("failed");
    setSheetTitle("Virtual account not created");
    setSheetDesc(
      "We couldn’t confirm your virtual account yet from your profile. You can try again or continue."
    );
    setSheetOpen(true);

    // auto redirect (shows sheet first)
    setTimeout(() => {
      router.replace("/dash");
    }, 2500);
  }

  /* ---------- submit to upgrade-tier ---------- */
  const onProceed = async () => {
    if (!photo) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        selfieImage: photo, // data URL (JPEG)
        bvn,
        hasSetWithdrawal: !!bank,
        bankName: bank?.bank?.name,
        logoUrl: bank?.bank?.logo,
        bankCode: bank?.bank?.code,
        accountNumber: bank?.accountNumber,
        accountName: bank?.accountName,
      };

      // Your mounted API route: /api/v1/upgrade-tier
      const url = "/api/v1/upgrade-tier";

      if (isDev) {
        console.info("[selfie] POST", url, {
          payloadSize: JSON.stringify(payload).length,
          selfieLen: photo.length,
          hasBank: !!bank,
          bvnPresent: !!bvn,
        });
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!ct.includes("application/json")) {
        throw new Error(
          res.status === 404
            ? `API route not found at ${url}. Ensure file exists at src/app/api/v1/upgrade-tier/route.ts and restart dev server.`
            : `Unexpected non-JSON from API (${res.status}). Body starts: ${text.slice(
                0,
                120
              )}...`
        );
      }

      let j: any = {};
      try {
        j = JSON.parse(text || "{}");
      } catch {
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      }

      if (!res.ok || j?.success === false) {
        throw new Error(j?.message || text || `HTTP ${res.status}`);
      }

      // ✅ After successful upgrade call, confirm VA exists via /api/user/me
      setSheetBusy(true);

      const verified = await verifyVirtualAccount();

      if (isDev) {
        console.info("[selfie] VA verify:", {
          ok: verified.ok,
          va: verified.va,
        });
      }

      if (verified.ok && verified.va?.accountNumber) {
        openResultSheetSuccess(verified.va);
      } else {
        openResultSheetFailed();
      }
    } catch (e: any) {
      if (isDev) console.error("[selfie] Submit error:", e);
      setError(e?.message || "Failed to submit selfie.");
    } finally {
      setSheetBusy(false);
      setSubmitting(false);
    }
  };

  /* ---------- sheet actions ---------- */
  const closeSheet = () => setSheetOpen(false);

  const onSheetPrimary = () => {
    // continue
    router.replace("/dash/components/settings/personal");
  };

  const onSheetSecondary = async () => {
    // retry verification only
    try {
      setSheetBusy(true);
      const verified = await verifyVirtualAccount();
      if (verified.ok && verified.va?.accountNumber) {
        openResultSheetSuccess(verified.va);
      } else {
        openResultSheetFailed();
      }
    } finally {
      setSheetBusy(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-white">
      {/* 🔥 show your centered logo spinner while capturing/submitting/verifying */}
      <LogoSpinner show={processing || submitting || sheetBusy} invert />

      {/* Result sheet */}
      <ResultSheet
        open={sheetOpen}
        type={sheetType}
        title={sheetTitle}
        description={sheetDesc}
        va={vaFound}
        onClose={closeSheet}
        onPrimary={onSheetPrimary}
        onSecondary={onSheetSecondary}
        primaryText="Continue"
        secondaryText="Try again"
        busy={sheetBusy}
      />

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 p-3 text-gray-900"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="text-[14px] font-semibold">Back</span>
        </button>
      </div>

      {/* Title */}
      <div className="px-4">
        <h1 className="text-[22px] font-extrabold text-gray-900">
          Face Capturing
        </h1>
      </div>

      {/* Big circle placeholder / preview */}
      <div className="px-4 mt-6 flex items-center justify-center">
        <div className="relative w-[260px] h-[260px] rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Selfie preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <CameraIcon className="w-12 h-12 text-gray-500" />
          )}
        </div>
      </div>

      {/* Open camera button */}
      <div className="px-4 mt-6 flex items-center justify-center">
        <button
          onClick={openCamera}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-2xl bg-black text-white font-semibold"
        >
          <CameraIcon className="w-5 h-5" />
          Open camera
        </button>
      </div>

      {/* Tips card */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.04)] ring-1 ring-gray-100 p-4">
          <p className="text-[13px] font-semibold text-gray-900 mb-3">
            We recommend that you…
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </span>
              <p className="text-[12.5px] text-gray-800">
                Stay in a highly lit environment
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <ScanFace className="w-4 h-4 text-blue-600" />
              </span>
              <p className="text-[12.5px] text-gray-800">
                Keep your face inside the frame
              </p>
            </div>

            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
                <Smile className="w-4 h-4 text-slate-700" />
              </span>
              <p className="text-[12.5px] text-gray-800">
                Remove sun glasses, hats, hijabs, face masks or any other face
                coverings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress + Proceed */}
      <div className="px-4 mt-8">
        <div className="text-[12px] text-gray-800 mb-2">Take a Selfie</div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-2 rounded-full bg-emerald-600 transition-all"
            style={{ width: "55%" }}
          />
        </div>

        {error && (
          <p className="mt-2 text-[12px] text-rose-600" role="alert">
            {error}
          </p>
        )}

        <button
          onClick={onProceed}
          disabled={!canProceed || submitting || sheetBusy}
          className={`mt-4 mb-8 w-full h-12 rounded-2xl text-white font-semibold ${
            !canProceed || submitting || sheetBusy
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-black active:scale-[0.99]"
          }`}
        >
          {submitting ? "Submitting…" : sheetBusy ? "Confirming…" : "Proceed"}
        </button>
      </div>

      {/* Camera modal with circular preview */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-[92%] max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                Take a selfie
              </h3>
              <button
                onClick={closeCamera}
                className="text-gray-700 hover:text-gray-900"
                aria-label="Close camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-4 flex items-center justify-center">
              {/* circular frame */}
              <div className="w-64 h-64 rounded-full overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              </div>
            </div>

            {!videoReady && (
              <p className="px-4 text-[12px] text-gray-600 mt-2">
                Initializing camera…
              </p>
            )}

            <div className="p-4 flex gap-3">
              <button
                onClick={onCapture}
                disabled={!videoReady || processing}
                className={`flex-1 h-11 rounded-xl text-white font-semibold ${
                  !videoReady || processing
                    ? "bg-black/50 cursor-not-allowed"
                    : "bg-black hover:bg-black/90"
                }`}
              >
                {processing ? "Processing…" : "Capture"}
              </button>

              <button
                onClick={closeCamera}
                className="flex-1 h-11 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
