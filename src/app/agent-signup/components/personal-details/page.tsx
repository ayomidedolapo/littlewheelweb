/* app/agent-signup/components/personal-details/page.tsx */
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  User,
  Eye,
  EyeOff,
  Camera as CameraIcon,
  X,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

const NEXT_STEP_ROUTE = "/agent-signup/components/address";
const SKEY = { SESSION_ID: "lw_flow_sessionId" };

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[2]) : "";
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidUsername = (v: string) => /^[a-zA-Z0-9._-]{3,32}$/.test(v.trim());

function PersonalDetailsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  // ---- session/token/device detection (coming from Create step) ----
  const [sessionId, setSessionId] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [deviceToken, setDeviceToken] = useState("");
  const [authBanner, setAuthBanner] = useState<string | null>(null);

  useEffect(() => {
    const qsSid = (sp.get("sessionId") || "").trim();
    let sid = qsSid;
    try {
      if (qsSid) sessionStorage.setItem(SKEY.SESSION_ID, qsSid);
      sid = sid || sessionStorage.getItem(SKEY.SESSION_ID) || "";
    } catch {}
    const cookieSid = getCookie("lw_signup_session");
    if (!sid && cookieSid) sid = cookieSid;
    setSessionId(sid);

    // token minted from /v2/auth/signup
    let tok = getCookie("lw_token") || "";
    if (!tok) {
      try {
        tok = localStorage.getItem("lw_token") || "";
      } catch {}
    }
    setBearerToken(tok);

    // deviceToken from create step (try cookie, localStorage, sessionStorage)
    let dt = getCookie("lw_device_token") || "";
    try {
      dt =
        dt ||
        localStorage.getItem("lw_device_token") ||
        sessionStorage.getItem("lw_device_token") ||
        "";
    } catch {}
    setDeviceToken(dt);

    if (!sid && !tok) {
      setAuthBanner("Missing signup session/token. Please verify your phone again.");
    }
  }, [sp]);

  // ---- form state ----
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // camera/photo (NOW REQUIRED)
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // validation
  const pinValid = useMemo(() => onlyDigits(pin).length === 5, [pin]);
  const firstValid = firstName.trim().length > 0;
  const middleValid = middleName.trim().length > 0;
  const lastValid = lastName.trim().length > 0;
  const dobValid = !!dob;
  const usernameValid = isValidUsername(username);
  const avatarValid = !!avatarDataUrl; // 👈 new: photo must be taken

  // keep button disabled until all text fields are okay & we have token
  const formValid =
    firstValid &&
    middleValid &&
    lastValid &&
    dobValid &&
    usernameValid &&
    pinValid &&
    (sessionId || bearerToken);

  const onPinChange = (v: string) => setPin(onlyDigits(v).slice(0, 5));
  const goBack = () => router.back();

  // camera helpers
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
      (video as any).srcObject = stream!;
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
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  }
  async function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    setProcessingPhoto(true);
    try {
      if (!videoReady) {
        setError("Camera starting…");
        return;
      }
      const dataUrl = downscale(video);
      if (!dataUrl) {
        setError("Couldn’t process the photo.");
        return;
      }
      closeCamera();
      setAvatarPreview(dataUrl);
      setAvatarDataUrl(dataUrl);
    } finally {
      setProcessingPhoto(false);
    }
  }
  function retakePhoto() {
    setAvatarPreview("");
    setAvatarDataUrl("");
    openCamera();
  }

  function resetAndStartOver() {
    try {
      sessionStorage.removeItem(SKEY.SESSION_ID);
      localStorage.removeItem("lw_token");
    } catch {}
    router.replace("/agent-signup/components/create");
  }

  // submit
  const saveAndContinue = async () => {
    if (saving) return;

    // basic field validation guard
    if (!formValid) {
      setError("Please fill all required fields before continuing.");
      return;
    }

    // 👀 enforce selfie as mandatory before proceeding
    if (!avatarValid) {
      setError("Please take a clear selfie before continuing.");
      return;
    }

    setSaving(true);
    setError(null);

    // pull the latest bearer from cookie/localStorage
    let actualToken = bearerToken;
    try {
      const cookieToken = getCookie("lw_token");
      const localStorageToken = localStorage.getItem("lw_token") || "";
      actualToken = bearerToken || cookieToken || localStorageToken || "";
      if (!actualToken && sessionId) {
        // optional helper: but only returns cookie token if already set
        try {
          const tokenResp = await fetch("/api/auth/get-v1-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
            credentials: "include",
          });
          const tokenData = await tokenResp.json().catch(() => ({}));
          if (tokenResp.ok && tokenData?.token) {
            actualToken = tokenData.token;
            setBearerToken(tokenData.token);
            try {
              localStorage.setItem("lw_token", tokenData.token);
            } catch {}
          }
        } catch {}
      }
    } catch {}

    if (!actualToken) {
      setError("No authentication token found. Please verify your phone again.");
      setSaving(false);
      return;
    }

    const payloadBase: Record<string, any> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim(),
      dob,
      referralCode: referralCode.trim() || undefined,
      password: pin, // backend expects 'password'
      gender,
      username: username.trim(),
      ...(sessionId ? { sessionId } : {}),
      ...(deviceToken ? { deviceToken } : {}),
    };

    if (avatarDataUrl) payloadBase.avatarUrl = avatarDataUrl;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(sessionId ? { "x-session-id": sessionId } : {}),
      Authorization: `Bearer ${actualToken}`,
      "x-lw-auth": actualToken,
      ...(deviceToken ? { "x-device-token": deviceToken } : {}),
    };

    try {
      const res = await fetch("/api/auth/submit-user-data", {
        method: "POST",
        headers,
        body: JSON.stringify(payloadBase),
        credentials: "include",
        cache: "no-store",
      });

      const raw = await res.text();
      let json: any;
      try {
        json = JSON.parse(raw);
      } catch {
        json = { message: raw };
      }

      if (!res.ok || json?.success === false) {
        const msg =
          json?.message ||
          json?.upstream?.message ||
          json?.error ||
          (res.status === 401
            ? "Unauthorized - token may be invalid or expired"
            : "Failed to save details");

        if (res.status === 401) {
          setAuthBanner("Authentication failed. Please verify your phone again.");
        }

        setError(String(msg));
        setSaving(false);
        return;
      }

      // persist first name for next step UX
      try {
        const fn = firstName.trim();
        if (fn) {
          sessionStorage.setItem("lw_first_name", fn);
          localStorage.setItem("lw_first_name", fn);
        }
      } catch {}

      router.push(NEXT_STEP_ROUTE);
    } catch (e: any) {
      setError(e?.message || "Network error. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-2">
          <button onClick={goBack} className="flex items-center text-gray-700 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </div>

        <div className="px-4">
          <h1 className="text-[22px] font-extrabold text-gray-900">You are almost done!</h1>
          <p className="text-[13px] text-gray-600 mt-1">
            We need a few details to set things up just right for you.
          </p>

          {authBanner && (
            <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-[12px] text-yellow-900">
              {authBanner}
              <div className="mt-2">
                <button
                  onClick={resetAndStartOver}
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-[12px] font-semibold text-white"
                >
                  Start over
                </button>
              </div>
            </div>
          )}

          {/* Profile image (NOW REQUIRED) */}
          <label className="block mt-5 text-[13px] font-semibold text-gray-800">
            Profile Image<span className="text-red-500">*</span>
          </label>
          <div className="mt-2">
            <button
              type="button"
              onClick={avatarPreview ? retakePhoto : openCamera}
              className="w-full flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3 hover:border-gray-400 transition"
            >
              <div className="w-12 h-12 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt="avatar preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <CameraIcon className="w-5 h-5 text-gray-700" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm text-gray-900 font-medium inline-flex items-center gap-2">
                  {processingPhoto && <LogoSpinner show={true} />}
                  {processingPhoto
                    ? "Processing…"
                    : avatarPreview
                    ? "Retake photo"
                    : "Take a photo"}
                </div>
                <div className="text-[12px] text-gray-600">
                  Front camera will open. A clear selfie is required.
                </div>
              </div>
              {avatarPreview && (
                <span className="ml-auto text-gray-700">
                  <RotateCcw className="w-4 h-4" />
                </span>
              )}
            </button>
          </div>

          {/* First / Middle / Last */}
          <label className="block mt-5 text-[13px] font-semibold text-gray-800">
            First Name<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <User className="w-4 h-4 text-gray-900" />
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Olarewaju"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Middle Name<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <User className="w-4 h-4 text-gray-900" />
            <input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Ayodele"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Last Name<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <User className="w-4 h-4 text-gray-900" />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Daniel"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* DOB */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Date of Birth<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 relative flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3 ring-1 ring-transparent focus-within:ring-black">
            <input
              type="date"
              max={todayISO()}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900
                         [appearance:none] [&::-webkit-calendar-picker-indicator]:opacity-0
                         [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Image
              src="/uploads/calendericon.png"
              alt="Open calendar"
              width={16}
              height={16}
              className="w-4 h-4 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            />
          </div>

          {/* Gender */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Gender<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 relative rounded-xl bg-gray-100 px-3 py-3 ring-1 ring-transparent focus-within:ring-black">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE")}
              className="w-full bg-transparent pr-8 text-sm text-gray-900 outline-none appearance-none"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Username */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Username<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3 ring-1 ring-transparent focus-within:ring-black">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="iyaamal007"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
          </div>
          {!isValidUsername(username) && username.length > 0 && (
            <p className="mt-1 text-[12px] text-rose-600">
              3–32 chars; letters, numbers, dot, underscore, or hyphen.
            </p>
          )}

          {/* Referral (optional) */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Referral Code
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3">
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
              placeholder="AD672S"
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 tracking-wider"
            />
          </div>

          {/* 5-digit PIN (password) */}
          <label className="block mt-4 text-[13px] font-semibold text-gray-800">
            Password<span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-3 ring-1 ring-transparent focus-within:ring-black">
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => onPinChange(e.target.value)}
              placeholder="•••••"
              maxLength={5}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400 tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowPin((s) => !s)}
              className="text-gray-700 hover:text-gray-900"
              aria-label={showPin ? "Hide password" : "Show password"}
            >
              {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-gray-600 mt-1">
            Password must be <span className="font-semibold">five numbers</span>
          </p>

          {/* Error banner with new styling */}
          {error && (
            <div
              className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800 flex items-start gap-2"
              role="alert"
              aria-live="assertive"
            >
              <span className="mt-[px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                !
              </span>
              <p className="flex-1">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-auto" />
        <div className="px-4">
          <div className="rounded-2xl p-3 mt-8">
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-gray-800">Personal Details</span>
              <span className="text-gray-600">4/5</span>
            </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: "70%" }}
              />
            </div>
          </div>

          <button
            onClick={saveAndContinue}
            disabled={!formValid || saving}
            className={`mb-5 w-full h-12 rounded-xl font-semibold text-white transition inline-flex items-center justify-center gap-2 ${
              !formValid || saving
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-black hover:bg-black/90"
            }`}
          >
            {saving ? (
              <>
                <LogoSpinner show={true} />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-white rounded-2xl w-[92%] max-w-sm overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Take a photo</h3>
              <button onClick={closeCamera} className="text-gray-700 hover:text-gray-900">
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
                onClick={capturePhoto}
                disabled={!videoReady || processingPhoto}
                className={`flex-1 h-11 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2 ${
                  !videoReady || processingPhoto
                    ? "bg-black/50 cursor-not-allowed"
                    : "bg-black hover:bg-black/90"
                }`}
              >
                {processingPhoto ? (
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

export default function PersonalDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PersonalDetailsInner />
    </Suspense>
  );
}
