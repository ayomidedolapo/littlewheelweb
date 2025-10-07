"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  RefreshCw,
  Lightbulb,
  ScanFace,
  Ban,
  SwitchCamera,
  Check,
} from "lucide-react";

export default function FaceCapturingPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // prevent concurrent opens
  const openingRef = useRef(false);

  const [isOpening, setIsOpening] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [videoReady, setVideoReady] = useState(false); // ✅ new: only true when frames are ready
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFront, setUseFront] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const isSecureOrigin =
    typeof window !== "undefined" &&
    (location.protocol === "https:" ||
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setHasStream(false);
    setVideoReady(false);
    // clean video element
    const v = videoRef.current;
    if (v) {
      v.onloadedmetadata = null;
      (v as any).oncanplay = null;
      v.srcObject = null;
    }
  }, []);

  function humanizeGetUserMediaError(e: any) {
    const name = e?.name || "";
    if (!isSecureOrigin) {
      return "Camera requires HTTPS (or localhost). Use an https URL (ngrok/Cloudflare/Vercel) to test on mobile.";
    }
    if (name === "NotAllowedError" || name === "SecurityError")
      return "Permission denied. Allow camera access in your browser settings and reload.";
    if (name === "AbortError" || name === "TypeError")
      return "Camera request was cancelled. Click ‘Open camera’ and allow access.";
    if (name === "NotFoundError" || name === "OverconstrainedError")
      return "No camera found or the requested camera isn’t available.";
    if (name === "NotReadableError")
      return "Camera is busy (used by another app). Close other apps and try again.";
    return e?.message || "Could not access a working camera.";
  }

  async function openCamera(frontPreferred = true) {
    if (openingRef.current || isOpening || hasStream) return;
    openingRef.current = true;
    setIsOpening(true);
    setError(null);
    setVideoReady(false);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser.");
      }

      // Try front/back with ‘exact’ first (some browsers support it), then ‘ideal’, then generic
      const trialsFront: MediaStreamConstraints[] = [
        { video: { facingMode: { exact: "user" } }, audio: false },
        { video: { facingMode: { ideal: "user" } }, audio: false },
        { video: true, audio: false },
        { video: { facingMode: { ideal: "environment" } }, audio: false },
      ];

      const trialsBack: MediaStreamConstraints[] = [
        { video: { facingMode: { exact: "environment" } }, audio: false },
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        { video: true, audio: false },
        { video: { facingMode: { ideal: "user" } }, audio: false },
      ];

      const attempts = frontPreferred ? trialsFront : trialsBack;

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      for (const c of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!stream) {
        throw lastErr || new Error("All camera attempts failed.");
      }

      // Bind to <video> AFTER it exists (next frame)
      streamRef.current = stream;
      setHasStream(true);

      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );

      const video = videoRef.current!;
      // iOS Safari quirks
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("autoplay", "true");
      video.setAttribute("muted", "true");
      video.srcObject = stream;

      const onReady = () => {
        setVideoReady(true);
        video.play().catch(() => {});
      };

      video.onloadedmetadata = onReady;
      (video as any).oncanplay = onReady;
      if ((video as any).readyState >= 2 && video.videoWidth > 0) onReady();
    } catch (e: any) {
      setError(humanizeGetUserMediaError(e));
      stopStream();
    } finally {
      setIsOpening(false);
      openingRef.current = false;
    }
  }

  // Downscale to keep file light; also un-mirror captured selfie
  function captureToDataUrl(video: HTMLVideoElement, mirror: boolean) {
    const w0 = video.videoWidth || 640;
    const h0 = video.videoHeight || 480;

    const MAX = 1200;
    let w = w0;
    let h = h0;
    if (w0 > h0 && w0 > MAX) {
      w = MAX;
      h = Math.round((h0 / w0) * MAX);
    } else if (h0 >= w0 && h0 > MAX) {
      h = MAX;
      w = Math.round((w0 / h0) * MAX);
    }

    const canvas = canvasRef.current!;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    return canvas.toDataURL("image/jpeg", 0.9);
  }

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (!videoReady || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("Camera is still starting. Please wait a moment.");
      return;
    }

    const dataUrl = captureToDataUrl(video, useFront);
    if (!dataUrl) {
      setError("Couldn’t process the photo. Please try again.");
      return;
    }
    setPhotoDataUrl(dataUrl);
    stopStream();
  };

  const retake = async () => {
    setPhotoDataUrl(null);
    await openCamera(useFront);
  };

  const flipCamera = async () => {
    const next = !useFront;
    setUseFront(next);
    setPhotoDataUrl(null);
    stopStream();
    await openCamera(next);
  };

  const handleBack = () => {
    stopStream();
    router.back();
  };

  const handleContinue = async () => {
    if (!photoDataUrl) return;
    const blob = await (await fetch(photoDataUrl)).blob();
    const form = new FormData();
    form.append("face", blob, `face-${Date.now()}.jpg`);
    const res = await fetch("/api/face-upload", { method: "POST", body: form });
    if (!res.ok) {
      setError((await res.text().catch(() => "")) || "Upload failed");
      return;
    }
    setShowSuccess(true);
  };

  // Auto-open only when secure (https or localhost). Otherwise show hint.
  useEffect(() => {
    if (!photoDataUrl && isSecureOrigin) {
      const t = setTimeout(() => openCamera(true), 150);
      return () => clearTimeout(t);
    }
  }, [openCamera, photoDataUrl, isSecureOrigin]);

  // Pause when hidden; try to resume when visible (if secure)
  useEffect(() => {
    const onVis = async () => {
      if (document.hidden) {
        stopStream();
      } else if (!photoDataUrl && isSecureOrigin) {
        await openCamera(useFront);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [openCamera, stopStream, photoDataUrl, useFront, isSecureOrigin]);

  useEffect(() => () => stopStream(), [stopStream]);

  const rectWrapper =
    "w-full h-48 md:h-56 rounded-xl border-2 border-dashed border-blue-300 bg-white flex items-center justify-center overflow-hidden";
  const circleWrapper =
    "w-[240px] h-[240px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center";

  const goToProfile = () =>
    router.push("/onboard-form/components/users-profile");

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
        <div className="w-full max-w-md bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center p-4 pt-8 bg-white">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>

          {/* insecure-origin warning */}
          {!isSecureOrigin && (
            <div className="mx-4 mb-2 rounded-lg bg-yellow-50 text-yellow-900 text-xs p-3 border border-yellow-200">
              You’re on an insecure URL (<code>http</code>). Camera is blocked
              on mobile. Use an <strong>https</strong> URL
              (ngrok/Cloudflare/Vercel) or localhost on the same device.
            </div>
          )}

          {/* Body */}
          <div className="px-4 pb-8">
            <h1 className="text-2xl font-bold text-gray-900">Face Capturing</h1>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              Capture the face of your customer
            </p>

            <div className="flex items-center justify-center">
              {!photoDataUrl ? (
                <div className={rectWrapper}>
                  {!hasStream ? (
                    <div className="flex flex-col items-center text-blue-600">
                      <Camera className="w-6 h-6 mb-2" />
                      <p className="text-sm">Waiting for camera…</p>
                      {error && (
                        <p className="mt-2 text-xs text-red-600 max-w-[18rem] text-center">
                          {error}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`relative w-full h-full ${
                        useFront ? "scale-x-[-1]" : ""
                      }`}
                    >
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover bg-black"
                        playsInline
                        muted
                        autoPlay
                      />
                      {!videoReady && (
                        <div className="absolute inset-0 flex items-end justify-center p-2">
                          <p className="text-xs text-white/80 bg-black/40 rounded px-2 py-1">
                            Initializing camera…
                          </p>
                        </div>
                      )}
                      {/* Optional guide */}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="w-56 h-56 rounded-full ring-2 ring-white/70" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={circleWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoDataUrl}
                    alt="Captured face"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              {!hasStream && !photoDataUrl && (
                <button
                  onClick={() => openCamera(true)}
                  disabled={isOpening || !isSecureOrigin}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                    isOpening || !isSecureOrigin
                      ? "bg-gray-200 text-gray-500"
                      : "bg-black text-white hover:bg-black/90"
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  {isOpening ? "Opening..." : "Open camera"}
                </button>
              )}
              {hasStream && (
                <>
                  <button
                    onClick={capturePhoto}
                    disabled={!videoReady}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                      videoReady
                        ? "bg-black text-white hover:bg-black/90"
                        : "bg-black/50 text-white cursor-not-allowed"
                    }`}
                  >
                    <Camera className="w-4 h-4" /> Capture photo
                  </button>
                  <button
                    onClick={flipCamera}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    <SwitchCamera className="w-4 h-4" /> Flip
                  </button>
                  <button
                    onClick={stopStream}
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    <CameraOff className="w-4 h-4" /> Close
                  </button>
                </>
              )}
              {photoDataUrl && !hasStream && (
                <button
                  onClick={retake}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="mt-6 rounded-2xl bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                We recommend that you…
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2 text-gray-700">
                  <Lightbulb className="w-4 h-4 mt-0.5 text-gray-600" />
                  <span>Stay in a highly lit environment</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <ScanFace className="w-4 h-4 mt-0.5 text-gray-600" />
                  <span>Keep your face inside the guide</span>
                </li>
                <li className="flex items-start gap-2 text-gray-700">
                  <Ban className="w-4 h-4 mt-0.5 text-gray-600" />
                  <span>
                    Remove sunglasses, hats, masks, or other coverings
                  </span>
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-6">
              <button
                onClick={handleContinue}
                disabled={!photoDataUrl}
                className={`w-full px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${
                  photoDataUrl
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Save and Continue
              </button>
              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            style={{ animation: "popIn 280ms cubic-bezier(0.22,1,0.36,1)" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-gray-200" />
            <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gray-50 ring-2 ring-pink-200">
              <Check className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Hurayyy!!!</h2>
            <p className="mt-1 text-sm text-gray-600">
              You just onboarded a new customer.
            </p>
            <button
              onClick={() =>
                router.push("/onboard-form/components/users-profile")
              }
              className="mt-6 w-full rounded-2xl bg-black px-6 py-4 text-sm font-semibold text-white hover:bg.black/90"
            >
              Go to user profile
            </button>
          </div>
        </div>
      )}
    </>
  );
}
