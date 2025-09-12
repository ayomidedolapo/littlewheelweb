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
} from "lucide-react";

export default function FaceCapturingPage() {
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isOpening, setIsOpening] = useState(false);
  const [hasStream, setHasStream] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFront, setUseFront] = useState(true);

  // ---------- helpers ----------
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setHasStream(false);
  }, []);

  async function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 3000) {
    video.setAttribute("playsinline", "true");
    video.setAttribute("muted", "true");
    video.setAttribute("autoplay", "true");
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) reject(new Error("Video metadata timeout"));
      }, timeoutMs);
      const onLoaded = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve();
      };
      if (video.readyState >= 1 && video.videoWidth > 0) onLoaded();
      else video.onloadedmetadata = onLoaded;
    });

    await video.play().catch(() => {});
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(), timeoutMs);
        video.oncanplay = () => {
          clearTimeout(t);
          resolve();
        };
      });
    }
  }

  const openCamera = async (front = true, attempt = 1) => {
    setError(null);
    setIsOpening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: front ? { ideal: "user" } : { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current!;
      video.srcObject = stream;
      await waitForVideoReady(video);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error("Camera produced zero dimensions");
      }
      setHasStream(true);
    } catch (e) {
      if (front && attempt === 1) {
        await openCamera(false, 2); // fallback to rear once
      } else {
        setError(
          "Could not access a working camera. Allow permission or try another camera."
        );
        stopStream();
      }
    } finally {
      setIsOpening(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0
    ) {
      setError("Camera not ready yet. Please try again.");
      return;
    }

    const canvas = canvasRef.current;
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
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
    if (hasStream) {
      stopStream();
      await openCamera(next);
    }
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
    form.append("customerId", "12345");

    const res = await fetch("/api/face-upload", { method: "POST", body: form });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      setError(msg || "Upload failed");
      return;
    }
    router.push("/agent-form/components/review");
  };

  useEffect(() => () => stopStream(), [stopStream]);

  const canProceed = !!photoDataUrl;

  // SHAPES:
  // - Before capture (placeholder or live preview): RECTANGLE with dashed border
  // - After capture (photoDataUrl): CIRCLE to match your mock
  const rectWrapper =
    "w-full h-48 md:h-56 rounded-xl border-2 border-dashed border-blue-300 bg-white flex items-center justify-center overflow-hidden";
  const circleWrapper =
    "w-[240px] h-[240px] rounded-full overflow-hidden bg-gray-100 flex items-center justify-center";

  return (
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

        {/* Body */}
        <div className="px-4 pb-8">
          <h1 className="text-2xl font-bold text-gray-900">Face Capturing</h1>
          <p className="text-sm text-gray-600 mt-1 mb-4">
            Capture the face of your customer
          </p>

          <div className="flex items-center justify-center">
            {/* RECTANGLE when no photo yet (placeholder or live) */}
            {!photoDataUrl ? (
              <div className={rectWrapper}>
                {!hasStream && (
                  <div className="flex flex-col items-center text-blue-600">
                    <Camera className="w-6 h-6 mb-2" />
                    <p className="text-sm">Image will be here</p>
                  </div>
                )}
                {hasStream && (
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover bg-black"
                    playsInline
                    muted
                    autoPlay
                  />
                )}
              </div>
            ) : (
              // CIRCLE after capture
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

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-3">
            {!hasStream && !photoDataUrl && (
              <button
                onClick={() => openCamera(true)}
                disabled={isOpening}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                  isOpening
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
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-black text-white hover:bg-black/90"
                >
                  <Camera className="w-4 h-4" />
                  Capture photo
                </button>
                <button
                  onClick={flipCamera}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  <SwitchCamera className="w-4 h-4" />
                  Flip
                </button>
                <button
                  onClick={stopStream}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
                >
                  <CameraOff className="w-4 h-4" />
                  Close
                </button>
              </>
            )}

            {photoDataUrl && !hasStream && (
              <button
                onClick={retake}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
                Retake
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
                <span>Your face inside the frame</span>
              </li>
              <li className="flex items-start gap-2 text-gray-700">
                <Ban className="w-4 h-4 mt-0.5 text-gray-600" />
                <span>
                  Remove sunglasses, hats, hijabs, face masks or any other face
                  coverings
                </span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6">
            <button
              onClick={handleContinue}
              disabled={!canProceed}
              className={`w-full px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${
                canProceed
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
  );
}
