/* app/bio-verify/page.tsx */
"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera as CameraIcon, X } from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

function downscale(video: HTMLVideoElement) {
  const w0 = video.videoWidth || 640;
  const h0 = video.videoHeight || 480;

  const MAX = 720; // a bit higher for liveness clarity
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

  // mirror selfie like the design
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);

  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function BioVerifyPage() {
  const router = useRouter();

  const [sending, setSending] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selfieDataUrl, setSelfieDataUrl] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const canProceed = useMemo(
    () => !!selfieDataUrl && !sending && !processing,
    [selfieDataUrl, sending, processing]
  );

  const goBack = () => router.back();

  async function openCamera() {
    setError(null);
    setVideoReady(false);

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
      video.muted = true;
      (video as any).playsInline = true;
      (video as any).srcObject = stream;

      const onReady = () => {
        setVideoReady(true);
        video.play().catch(() => {});
      };

      video.onloadedmetadata = onReady;
      video.oncanplay = onReady;

      if ((video as any).readyState >= 2) onReady();
    });
  }

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

  async function capture() {
    const v = videoRef.current;
    if (!v) return;

    setProcessing(true);
    try {
      if (!videoReady) {
        setError("Camera starting…");
        return;
      }
      const data = downscale(v);
      if (!data) {
        setError("Couldn’t process photo.");
        return;
      }
      closeCamera();
      setSelfieDataUrl(data);
    } finally {
      setProcessing(false);
    }
  }

  function retake() {
    setSelfieDataUrl("");
    openCamera();
  }

  async function proceed() {
    if (!canProceed) return;

    setSending(true);
    setError(null);

    try {
      // Hook your liveness verify API here
      // await fetch("/api/auth/bio-verify", { method: "POST", body: JSON.stringify({ selfie: selfieDataUrl }) })

      router.push("/dash"); // or your next step
    } catch (e: any) {
      setError(e?.message || "Verification failed. Please try again.");
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
      <LogoSpinner show={sending || processing} />

      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        <div className="px-4 pt-6">
          {/* Back */}
          <button
            onClick={goBack}
            disabled={sending || processing}
            className="inline-flex items-center gap-2 text-[12px] font-semibold text-gray-700 hover:text-gray-900 disabled:text-gray-400"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back
          </button>

          {/* Title */}
          <h1 className="mt-6 text-[18px] font-extrabold text-gray-900">
            Liveness Check
          </h1>
          <p className="mt-2 text-[13px] text-gray-600 leading-snug">
            Enter your phone number to get rolling with Little Wheel
          </p>

          {error && (
            <div
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {/* Big circle */}
          <div className="mt-8 flex flex-col items-center">
            <div className="w-[160px] h-[160px] rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {selfieDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selfieDataUrl}
                  alt="Captured selfie"
                  className="w-full h-full object-cover"
                />
              ) : (
                <CameraIcon className="w-8 h-8 text-gray-900" />
              )}
            </div>

            {/* Open camera button */}
            <button
              onClick={selfieDataUrl ? retake : openCamera}
              disabled={sending || processing}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-white text-[13px] font-semibold hover:bg-black/90 disabled:bg-black/40"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-white/10">
                <CameraIcon className="w-4 h-4" />
              </span>
              Open camera
            </button>
          </div>

          {/* Recommend card */}
          <div className="mt-7 rounded-2xl bg-gray-100 px-4 py-4">
            <p className="text-[13px] font-extrabold text-gray-900">
              We recommend that you...
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Image
                  src="/uploads/idea.png"
                  alt="Tip"
                  width={18}
                  height={18}
                  className="mt-[2px]"
                />
                <p className="text-[12px] text-gray-700">
                  Stay in a highly lit environment
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Image
                  src="/uploads/frame22.png"
                  alt="Face"
                  width={18}
                  height={18}
                  className="mt-[2px]"
                />
                <p className="text-[12px] text-gray-700">
                  Your face inside the frame
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Image
                  src="/uploads/facec.png"
                  alt="No coverings"
                  width={18}
                  height={18}
                  className="mt-[2px]"
                />
                <p className="text-[12px] text-gray-700 leading-snug">
                  Remove sun glasses , hats, hijabs, face masks or any other face
                  coverings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Proceed */}
        <div className="mt-auto px-4 pb-8 pt-10">
          <button
            onClick={proceed}
            disabled={!canProceed}
            className={`w-full h-12 rounded-xl text-[14px] font-semibold transition-colors ${
              canProceed
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Proceed
          </button>
        </div>
      </div>

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Camera</h3>
              <button
                onClick={closeCamera}
                className="text-gray-700 hover:text-gray-900"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-4">
              <video
                ref={videoRef}
                className="w-full aspect-[3/4] rounded-lg bg-black object-cover"
                playsInline
                muted
                style={{ transform: "scaleX(-1)" }}
              />
              {!videoReady && (
                <p className="text-[12px] text-gray-600 mt-2 inline-flex items-center gap-2">
                  <LogoSpinner show={true} /> Initializing camera…
                </p>
              )}
            </div>

            <div className="p-4 flex gap-3">
              <button
                onClick={capture}
                disabled={!videoReady || processing}
                className={`flex-1 h-11 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 ${
                  !videoReady || processing
                    ? "bg-black/50 cursor-not-allowed"
                    : "bg-black hover:bg-black/90"
                }`}
              >
                {processing ? (
                  <>
                    <LogoSpinner show={true} />
                    Processing…
                  </>
                ) : (
                  "Capture"
                )}
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