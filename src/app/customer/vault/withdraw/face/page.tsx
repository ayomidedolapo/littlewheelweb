/* app/customer/vault/withdraw/face/page.tsx */
"use client";

import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Camera as CameraIcon,
  RefreshCcw,
  X,
} from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner";

/* ---------------- helpers ---------------- */
const isBrowser = typeof window !== "undefined";
const OTP_LEN = 4;

function getAuthToken(): string {
  try {
    const m = isBrowser
      ? document.cookie.match(
          /(?:^|;\s*)(authToken|lw_token|token)\s*=\s*([^;]+)/
        )
      : null;
    if (m?.[2]) return decodeURIComponent(m[2]);
  } catch {}
  try {
    return isBrowser
      ? localStorage.getItem("lw_token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("token") ||
          ""
      : "";
  } catch {
    return "";
  }
}

/* ======================= Inner (uses useSearchParams) ======================= */

function FaceCapturePageInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // persist scoped customerId if present (keeps context across pages)
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

  const customerId =
    sp.get("customerId") ||
    (isBrowser
      ? sessionStorage.getItem("lw_active_customer_id") ||
        sessionStorage.getItem("lw_onboarding_customer_id") ||
        ""
      : "");
  const vaultId = sp.get("vaultId") || "";
  const amount = sp.get("amount") || "";
  const ref = sp.get("ref") || "";

  const token = getAuthToken();

  /* ---------------- shared state ---------------- */
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  /* ---------------- mode & swipe (facial / otp) ---------------- */
  type Mode = "facial" | "otp";
  const [mode, setMode] = useState<Mode>("facial"); // default to facial

  const swipeStartX = useRef<number | null>(null);
  const swipePointerId = useRef<number | null>(null);

  const handleSwipePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = e.clientX;
    swipePointerId.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleSwipePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipePointerId.current !== e.pointerId) return;

    const startX = swipeStartX.current;
    swipeStartX.current = null;
    swipePointerId.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (startX == null) return;
    const dx = e.clientX - startX;
    const THRESHOLD = 40;

    if (Math.abs(dx) < THRESHOLD) return;

    // Swipe left (dx < 0) from facial -> OTP
    if (dx < -THRESHOLD && mode === "facial") {
      setMode("otp");
    }
    // Swipe right (dx > 0) from OTP -> facial
    else if (dx > THRESHOLD && mode === "otp") {
      setMode("facial");
    }
  };

  /* ---------------- facial capture state ---------------- */
  const [img, setImg] = useState<string | null>(null); // dataURL preview

  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "user"
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }
  function closeCamera() {
    setCameraOpen(false);
    setVideoReady(false);
    const v = videoRef.current;
    if (v) {
      v.onloadedmetadata = null;
      v.oncanplay = null;
      (v as any).srcObject = null;
    }
    stopCamera();
  }
  async function openCamera(facing: "user" | "environment" = cameraFacing) {
    setCameraError(null);
    setVideoReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera not available on this device/browser.");
      return;
    }

    const tries: MediaStreamConstraints[] = [
      { video: { facingMode: { exact: facing } }, audio: false },
      { video: { facingMode: facing }, audio: false },
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
      setCameraError("Couldn’t start camera. Check permissions and try again.");
      return;
    }

    streamRef.current = stream;
    setCameraOpen(true);

    requestAnimationFrame(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = true;
      (video as any).playsInline = true;
      (video as any).srcObject = stream!;
      const ready = () => {
        setVideoReady(true);
        video.play().catch(() => {});
      };
      video.onloadedmetadata = ready;
      video.oncanplay = ready;
      if ((video as any).readyState >= 2) ready();
    });
  }
  async function flipCamera() {
    const next = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(next);
    stopCamera();
    await openCamera(next);
  }
  function downscale(video: HTMLVideoElement) {
    const w0 = video.videoWidth || 640;
    const h0 = video.videoHeight || 480;
    const MAX = 480;
    let w = w0,
      h = h0;
    if (w0 > h0 && w0 > MAX) {
      w = MAX;
      h = Math.round((h0 / w0) * MAX);
    } else if (h0 >= w0 && h0 > MAX) {
      h = MAX;
      w = Math.round((w0 / h0) * MAX);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    if (cameraFacing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  }
  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    setProcessingPhoto(true);
    try {
      if (!videoReady) {
        setCameraError("Camera starting…");
        return;
      }
      const dataUrl = downscale(video);
      if (!dataUrl) {
        setCameraError("Couldn’t process the photo.");
        return;
      }
      setImg(dataUrl);
      closeCamera(); // show preview; Confirm button enables after this
    } finally {
      setProcessingPhoto(false);
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /* ---------------- OTP state (4 boxes) ---------------- */
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(OTP_LEN).fill(""));
  const [otpStatus, setOtpStatus] = useState<"idle" | "error" | "success">(
    "idle"
  );
  const otpInputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const otpValue = useMemo(() => otpDigits.join(""), [otpDigits]);

  const focusOtpIndex = (i: number) => otpInputsRef.current[i]?.focus();
  const setOtpDigit = (i: number, v: string) => {
    const next = [...otpDigits];
    next[i] = v;
    setOtpDigits(next);
  };

  const handleOtpChange = (index: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 1);
    if (!v) {
      setOtpDigit(index, "");
      return;
    }
    setOtpDigit(index, v);
    if (index < OTP_LEN - 1) focusOtpIndex(index + 1);
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && otpDigits[index] === "" && index > 0) {
      e.preventDefault();
      setOtpDigit(index - 1, "");
      focusOtpIndex(index - 1);
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && index > 0) {
      e.preventDefault();
      focusOtpIndex(index - 1);
    }
    if (
      (e.key === "ArrowRight" || e.key === "ArrowDown") &&
      index < OTP_LEN - 1
    ) {
      e.preventDefault();
      focusOtpIndex(index + 1);
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const txt = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LEN);
    if (txt.length) {
      e.preventDefault();
      const next = txt
        .padEnd(OTP_LEN, " ")
        .split("")
        .slice(0, OTP_LEN)
        .map((c) => (/\d/.test(c) ? c : ""));
      setOtpDigits(next);
      focusOtpIndex(Math.min(txt.length, OTP_LEN - 1));
    }
  };

  const baseOtpBox =
    "w-12 h-12 md:w-14 md:h-14 text-center text-xl md:text-2xl font-bold rounded-xl border-2 focus:outline-none transition-all duration-150";

  const colorForOtpStatus = (filled: boolean) => {
    if (otpStatus === "success")
      return "border-green-500 bg-green-50 text-green-700";
    if (otpStatus === "error") return "border-red-500 bg-red-50 text-red-700";
    return filled
      ? "border-black text-gray-900 bg-white"
      : "border-gray-300 text-gray-900 bg-white";
  };

  /* ---------------- Request OTP (wired) ---------------- */
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);

  async function handleRequestOtp() {
    if (!customerId || !vaultId) {
      setOtpError("Missing customer or vault reference.");
      setOtpInfo(null);
      return;
    }

    if (!token) {
      setOtpError("Missing authentication. Please log in again.");
      setOtpInfo(null);
      return;
    }

    try {
      setRequestingOtp(true);
      setOtpError(null);
      setOtpInfo(null);
      setOtpStatus("idle");

      const payload: Record<string, any> = {};
      if (ref) {
        payload.reference = ref;
        payload.referenceId = ref;
      }
      if (amount) payload.amount = String(amount);

      const res = await fetch(
        `/api/v1/agent/customers/${customerId}/vaults/${vaultId}/withdraw/request-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lw-auth": token,
          },
          cache: "no-store",
          body: JSON.stringify(payload),
        }
      );

      const ct = res.headers.get("content-type") || "";
      const j =
        ct.includes("application/json") && (await res.json().catch(() => ({})));

      if (!res.ok) {
        const msg =
          (j as any)?.message ||
          (j as any)?.error ||
          (j as any)?.upstream?.message ||
          `Failed to request OTP (HTTP ${res.status}).`;
        setOtpError(msg);
        setOtpStatus("error");
        return;
      }

      // reset boxes + focus first
      setOtpDigits(Array(OTP_LEN).fill(""));
      setTimeout(() => focusOtpIndex(0), 50);

      setOtpInfo("Code sent to the customer’s phone.");
      setOtpStatus("idle");
    } catch (e: any) {
      setOtpError(
        e?.message || "Failed to request OTP. Please try again."
      );
      setOtpInfo(null);
      setOtpStatus("error");
    } finally {
      setRequestingOtp(false);
    }
  }

  /* ---------------- Proceed / finalize ---------------- */
  const canProceed = useMemo(() => {
    if (!customerId || !vaultId) return false;
    if (mode === "facial") return !!img;
    if (mode === "otp") return otpValue.length === OTP_LEN;
    return false;
  }, [customerId, vaultId, mode, img, otpValue]);

  async function finalize() {
    setGlobalError(null);

    if (!customerId || !vaultId) {
      setGlobalError("Missing customer or vault reference. Go back and try again.");
      return;
    }

    if (mode === "facial" && !img) {
      setGlobalError("Capture the customer’s face before confirming.");
      return;
    }
    if (mode === "otp" && otpValue.length !== OTP_LEN) {
      setGlobalError("Enter the 4-digit OTP code.");
      return;
    }

    try {
      setSubmitting(true);

      const payload: Record<string, any> = { mode }; // "facial" | "otp"

      if (mode === "facial") {
        payload.selfieImageURL = img;
        payload.selfieImage = img;
        payload.image = img;
        payload.photo = img;
      } else if (mode === "otp") {
        payload.otp = otpValue;
      }

      if (ref) {
        payload.reference = ref;
        payload.referenceId = ref;
      }
      if (amount) payload.amount = String(amount);

      const res = await fetch(
        `/api/v1/agent/customers/${customerId}/vaults/${vaultId}/withdraw/finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "x-lw-auth": token } : {}),
          },
          cache: "no-store",
          body: JSON.stringify(payload),
        }
      );

      const ct = res.headers.get("content-type") || "";
      const j =
        ct.includes("application/json") && (await res.json().catch(() => ({})));

      if (!res.ok) {
        const msg =
          (j as any)?.message ||
          (j as any)?.error ||
          (j as any)?.upstream?.message ||
          `Finalize failed (HTTP ${res.status}).`;
        setOtpStatus("error");
        setGlobalError(msg);
        return;
      }

      setOtpStatus("success");

      // ✅ On success, go straight to dashboard
      router.push("/dash");
    } catch (e: any) {
      setGlobalError(
        e?.message || "Couldn’t finalize withdrawal. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const goBack = () => router.back();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto px-5 pt-4 pb-8 flex flex-col min-h-screen">
        {/* header */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="mt-4 text-[22px] font-extrabold text-black">
          Verify withdrawal
        </h1>
        <p className="mt-1 text-[12px] text-gray-600">
          Swipe to choose how to confirm this withdrawal:{" "}
          <span className="font-semibold">Face match</span> or{" "}
          <span className="font-semibold">OTP code</span>.
        </p>

        {/* swipe container */}
        <div
          className="mt-6 flex-1 relative overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onPointerDown={handleSwipePointerDown}
          onPointerUp={handleSwipePointerUp}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{
              transform:
                mode === "facial" ? "translateX(0%)" : "translateX(-100%)",
            }}
          >
            {/* -------- FACIAL SLIDE -------- */}
            <div className="w-full flex-shrink-0 flex flex-col items-center justify-center">
              <div
                className="w-44 h-44 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden"
                aria-live="polite"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt="Captured preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CameraIcon className="w-10 h-10 text-gray-400" />
                )}
              </div>

              <button
                type="button"
                onClick={() => openCamera("user")}
                className="mt-4 inline-flex items-center gap-2 px-5 h-11 rounded-2xl bg-black text-white font-semibold"
              >
                <CameraIcon className="w-5 h-5" />
                Open camera
              </button>

              <div className="mt-6 w-full rounded-2xl border border-gray-200 bg-white p-4">
                <p className="text-[13px] font-semibold text-gray-800 mb-2">
                  For best match:
                </p>
                <ul className="text-[12px] text-gray-700 space-y-2">
                  <li>💡 Stay in a bright, well-lit place.</li>
                  <li>🧭 Keep the customer’s face inside the circle.</li>
                  <li>🧢 Remove caps, glasses, or face coverings.</li>
                </ul>
                {!customerId || !vaultId ? (
                  <p className="mt-3 text-[11px] text-amber-700">
                    Heads up: customerId or vaultId missing in URL.
                  </p>
                ) : null}
              </div>
            </div>

            {/* -------- OTP SLIDE -------- */}
            <div className="w-full flex-shrink-0 flex flex-col items-center justify-center">
              <div className="mt-2 max-w-xs text-center">
                <h2 className="text-[18px] font-semibold text-gray-900">
                  Enter OTP code
                </h2>
                <p className="mt-1 text-[12px] text-gray-600">
                  A 4-digit code will be sent to the customer&apos;s phone.
                  Enter it to confirm this withdrawal.
                </p>
              </div>

              {/* OTP boxes */}
              <div className="flex justify-center gap-3 my-5">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpInputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    className={`${baseOtpBox} ${colorForOtpStatus(
                      !!digit
                    )} focus:ring-2 focus:ring-gray-100 focus:border-black`}
                  />
                ))}
              </div>

              {/* Request code */}
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={requestingOtp}
                className="text-sm font-medium text-black underline disabled:opacity-60"
              >
                {requestingOtp ? "Requesting code…" : "Request code"}
              </button>

              {otpInfo && (
                <p className="mt-2 text-[11px] text-emerald-700">{otpInfo}</p>
              )}
              {otpError && (
                <p className="mt-2 text-[11px] text-rose-600">{otpError}</p>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="pt-6">
          <button
            onClick={finalize}
            disabled={!canProceed || submitting}
            className={`w-full h-12 rounded-2xl font-semibold text-white ${
              canProceed && !submitting
                ? "bg-black hover:bg-black/90"
                : "bg-black/30 cursor-not-allowed"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {submitting && <LogoSpinner className="w-4 h-4" />}
              {submitting ? "Submitting…" : "Confirm"}
            </span>
          </button>

          {globalError && (
            <p className="mt-3 text-xs text-rose-600">{globalError}</p>
          )}
        </div>
      </div>

      {/* ===== Camera Modal ===== */}
      {cameraOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Camera"
        >
          <div className="bg-white rounded-2xl w-[92%] max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                Take a photo
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={flipCamera}
                  className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm font-medium"
                >
                  <RefreshCcw className="w-4 h-4" />
                  {cameraFacing === "user" ? "Flip to Back" : "Flip to Front"}
                </button>
                <button
                  onClick={closeCamera}
                  className="text-gray-700 hover:text-gray-900"
                  aria-label="Close camera"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-4">
              <video
                ref={videoRef}
                className="w-full aspect-[3/4] rounded-lg bg-black object-cover"
                playsInline
                muted
                style={{
                  transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
                }}
              />
              {!videoReady && (
                <p
                  className="text-[12px] text-gray-600 mt-2 inline-flex items-center gap-2"
                  role="status"
                >
                  <LogoSpinner className="w-4 h-4" />
                  Initializing camera…
                </p>
              )}
              {cameraError && (
                <p className="text-[12px] text-rose-600 mt-2" role="alert">
                  {cameraError}
                </p>
              )}
            </div>

            <div className="p-4 flex gap-3">
              <button
                onClick={capturePhoto}
                disabled={!videoReady || processingPhoto}
                className={`flex-1 h-11 rounded-xl text-white font-semibold ${
                  !videoReady || processingPhoto
                    ? "bg-black/50 cursor-not-allowed"
                    : "bg-black hover:bg-black/90"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {processingPhoto && <LogoSpinner className="w-4 h-4" />}
                  {processingPhoto ? "Processing…" : "Capture"}
                </span>
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

/* ======================= Wrapper with Suspense ======================= */

export default function FaceCapturePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <FaceCapturePageInner />
    </Suspense>
  );
}
