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
} from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner"; // ← ✅ add your spinner

/* ---------- types ---------- */
type SavedBank = {
  bank: { name: string; code?: string | number; logo?: string };
  accountNumber: string;
  accountName: string;
};

const isDev = process.env.NODE_ENV !== "production";

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

      // Your mounted API route: /api/v1/upgrade-tier (no "user")
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

      // Guard against HTML 404 page
      if (!ct.includes("application/json")) {
        throw new Error(
          res.status === 404
            ? `API route not found at ${url}. Ensure file exists at src/app/api/v1/upgrade-tier/route.ts and restart dev server.`
            : `Unexpected non-JSON from API (${
                res.status
              }). Body starts: ${text.slice(0, 120)}...`
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

      // success → back to Personal settings
      router.push("/dash/components/settings/personal");
    } catch (e: any) {
      if (isDev) console.error("[selfie] Submit error:", e);
      setError(e?.message || "Failed to submit selfie.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-white">
      {/* 🔥 show your centered logo spinner while capturing/submitting */}
      <LogoSpinner show={processing || submitting} invert />

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
          disabled={!canProceed || submitting}
          className={`mt-4 mb-8 w-full h-12 rounded-2xl text-white font-semibold ${
            !canProceed || submitting
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-black active:scale-[0.99]"
          }`}
        >
          {submitting ? "Submitting…" : "Proceed"}
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
