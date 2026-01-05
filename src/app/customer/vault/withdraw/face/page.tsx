/* app/customer/vault/withdraw/face/page.tsx */
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Camera as CameraIcon,
  Check,
  RefreshCcw,
  X,
} from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner";

/* ---------------- helpers ---------------- */
const isBrowser = typeof window !== "undefined";

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

  // preview + submit
  const [img, setImg] = useState<string | null>(null); // dataURL preview
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  // camera (mirrors Personal Details camera behavior)
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
      closeCamera(); // show preview; Proceed button enables after this
    } finally {
      setProcessingPhoto(false);
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ✅ enable proceed as soon as we have a photo
  const canProceed = useMemo(() => !!img, [img]);

  async function finalize() {
    if (!img) return;

    // guard+message if params are missing (so button still works after capture)
    if (!customerId || !vaultId) {
      alert("Missing customer or vault reference. Go back and try again.");
      return;
    }

    try {
      setSubmitting(true);

      // ✅ FIX: explicitly send verification mode (backend expects it)
      const payload: Record<string, any> = {
        mode: "FACIAL",
        verificationMode: "FACIAL",
        withdrawalVerificationMode: "FACIAL",

        selfieImageURL: img,

        ...(ref ? { reference: ref, referenceId: ref } : {}),
        ...(amount ? { amount: String(amount) } : {}),
      };

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

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          j?.message ||
          j?.error ||
          j?.upstream?.message ||
          `Finalize failed (HTTP ${res.status}).`;
        throw new Error(msg);
      }

      setSuccessOpen(true);
    } catch (e: any) {
      alert(e?.message || "Couldn’t finalize withdrawal.");
    } finally {
      setSubmitting(false);
    }
  }

  const goBack = () => router.back();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-sm mx-auto px-5 pt-4">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="mt-4 text-[22px] font-extrabold text-black">
          Face Capturing
        </h1>

        <div className="mt-6 flex flex-col items-center">
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
              We recommend that you…
            </p>
            <ul className="text-[12px] text-gray-700 space-y-2">
              <li>💡 Stay in a highly lit environment</li>
              <li>🧭 Keep your face inside the frame</li>
              <li>🧢 Remove sun glasses, hats, masks or other coverings</li>
            </ul>
            {!customerId || !vaultId ? (
              <p className="mt-3 text-[11px] text-amber-700">
                Heads up: customerId or vaultId missing in URL.
              </p>
            ) : null}
          </div>
        </div>

        <div className="pt-8 pb-10">
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
              {submitting ? "Submitting…" : "Proceed"}
            </span>
          </button>
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

      {/* ===== Success Bottom Sheet ===== */}
      <div
        className={`fixed inset-0 z-50 ${
          successOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            successOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setSuccessOpen(false)}
        />
        <div
          className={`absolute left-0 right-0 bottom-0 transition-transform duration-300 ${
            successOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mx-auto w-full max-w-sm bg-white rounded-t-3xl p-8 shadow-2xl">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Withdrawal Submitted
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              We’ve received your confirmation.
            </p>
            <button
              onClick={() => {
                setSuccessOpen(false);
                const q = new URLSearchParams();
                if (customerId) q.set("customerId", customerId);
                router.push(`/customer/vault?${q.toString()}`);
              }}
              className="w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              Done
            </button>
          </div>
        </div>
      </div>
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
