"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User2,
  AtSign,
  Calendar as CalendarIcon,
  ChevronDown,
  Check,
  Camera as CameraIcon,
  X,
  Image as ImageIcon,
  Mail,
  RefreshCcw,
} from "lucide-react";

/** Utility: simple email check */
function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function PersonalDetailsPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    username: "",
    email: "",
    gender: "",
    dob: "",
    avatarUrl: "", // holds captured dataURL OR typed URL
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ------- Camera state -------
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "user"
  );
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fieldBox =
    "w-full rounded-lg border border-gray-300 focus:border-black focus:ring-0 placeholder-gray-400 bg-white h-12 pl-10 pr-3 text-sm";
  const labelCls =
    "text-sm font-medium text-gray-800 flex items-center gap-1 mb-2";
  const errorCls = "mt-1 text-xs text-red-600";

  // --- Validation
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.username.trim()) e.username = "Username is required.";
    if (!form.gender) e.gender = "Select a gender.";
    if (!form.dob) e.dob = "Date of birth is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!isEmail(form.email)) e.email = "Enter a valid email.";
    // avatarUrl optional
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((s) => ({ ...s, [field]: e.target.value }));

  const markAllTouched = () =>
    setTouched({
      firstName: true,
      lastName: true,
      middleName: true,
      username: true,
      email: true,
      gender: true,
      dob: true,
      avatarUrl: true,
    });

  // Step state – phone step already completed
  const isPhoneVerified = true;

  // ------- Camera helpers -------
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
    setErrorMsg(null);
    setVideoReady(false);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMsg("Camera not available on this device/browser.");
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
      setErrorMsg("Couldn’t start camera. Check permissions and try again.");
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

    // mirror when front camera
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
        setErrorMsg("Camera starting…");
        return;
      }
      const dataUrl = downscale(video);
      if (!dataUrl) {
        setErrorMsg("Couldn’t process the photo.");
        return;
      }
      setForm((s) => ({ ...s, avatarUrl: dataUrl }));
      closeCamera();
    } finally {
      setProcessingPhoto(false);
    }
  }

  function clearPhoto() {
    setForm((s) => ({ ...s, avatarUrl: "" }));
  }

  // ------- Submit -------
  async function onSubmit() {
    if (!isValid || submitting) {
      if (!isValid) markAllTouched();
      return;
    }

    const token = sessionStorage.getItem("lw_reg_token");
    if (!token) {
      setErrorMsg("Missing registration token. Please restart onboarding.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined, // dataURL or normal URL
        gender: form.gender.toUpperCase(), // "MALE" | "FEMALE" | "OTHER"
        dob: form.dob, // YYYY-MM-DD
        token,
        email: form.email.trim(),
        username: form.username.trim(),
      };

      const res = await fetch("/api/v1/agent/customers/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text || "{}");
      } catch {}

      if (!res.ok) {
        const msg = json?.message || json?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const customerId =
        json?.data?.customerId || json?.data?.id || json?.customerId || null;
      if (customerId)
        sessionStorage.setItem("lw_onboarding_customer_id", String(customerId));

      router.push("/onboard-form/components/address");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to save details.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleBack = () => router.back();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-3xl bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden">
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
        <div className="px-4 md:px-8 pb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            You are almost done!
          </h1>
          <p className="text-sm text-gray-600 mt-1 mb-6">
            We need a few details to complete their account opening
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form */}
            <div className="md:col-span-2 space-y-5">
              {/* Profile Photo (capture) */}
              <div>
                <label className={labelCls}>Profile Image (optional)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openCamera()}
                    className="inline-flex items-center gap-2 h-12 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium"
                  >
                    <CameraIcon className="w-4 h-4" />
                    {form.avatarUrl ? "Retake Photo" : "Take Photo"}
                  </button>

                  {form.avatarUrl ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.avatarUrl}
                        alt="profile preview"
                        className="w-12 h-12 rounded-full object-cover border"
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <ImageIcon className="w-4 h-4" />
                      No photo added
                    </div>
                  )}
                </div>
              </div>

              {/* First Name */}
              <div>
                <label className={labelCls}>
                  First Name<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange("firstName")}
                    placeholder="e.g. John"
                    className={fieldBox}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, firstName: true }))
                    }
                  />
                </div>
                {touched.firstName && errors.firstName && (
                  <p className={errorCls}>{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className={labelCls}>
                  Last Name<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange("lastName")}
                    placeholder="e.g. Doe"
                    className={fieldBox}
                    onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                  />
                </div>
                {touched.lastName && errors.lastName && (
                  <p className={errorCls}>{errors.lastName}</p>
                )}
              </div>

              {/* Middle Name (optional) */}
              <div>
                <label className={labelCls}>Middle Name</label>
                <div className="relative">
                  <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.middleName}
                    onChange={handleChange("middleName")}
                    placeholder="e.g. Monroe"
                    className={fieldBox}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, middleName: true }))
                    }
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className={labelCls}>
                  Username/Nickname<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={handleChange("username")}
                    placeholder="e.g PappyShinzy"
                    className={fieldBox}
                    onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                  />
                </div>
                {touched.username && errors.username && (
                  <p className={errorCls}>{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>
                  Email<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="john@doe.com"
                    className={fieldBox}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  />
                </div>
                {touched.email && errors.email && (
                  <p className={errorCls}>{errors.email}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className={labelCls}>
                  Gender<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.gender}
                    onChange={handleChange("gender")}
                    className={`${fieldBox} appearance-none pr-8 cursor-pointer`}
                    onBlur={() => setTouched((t) => ({ ...t, gender: true }))}
                  >
                    <option value="" disabled>
                      Select gender
                    </option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                </div>
                {touched.gender && errors.gender && (
                  <p className={errorCls}>{errors.gender}</p>
                )}
              </div>

              {/* DOB */}
              <div>
                <label className={labelCls}>
                  Date of Birth<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={form.dob}
                    onChange={handleChange("dob")}
                    className={`${fieldBox} [color-scheme:light]`}
                    onBlur={() => setTouched((t) => ({ ...t, dob: true }))}
                  />
                </div>
                {touched.dob && errors.dob && (
                  <p className={errorCls}>{errors.dob}</p>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  {errorMsg}
                </p>
              )}
            </div>

            {/* Steps */}
            <aside className="md:col-span-1">
              <div className="mb-15 mt-20">
                <h3 className="text-gray-900 font-semibold text-sm mb-4 underline">
                  Steps to Onboard New Users
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        isPhoneVerified ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Verify Phone Number
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Add Personal Details
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Add User Address
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-600 text-sm">
                      Face Capturing
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="mt-8">
            <button
              onClick={onSubmit}
              disabled={!isValid || submitting}
              className={`w-full md:w-auto px-6 py-4 rounded-xl text-sm font-semibold transition-colors ${
                isValid && !submitting
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {submitting ? "Saving…" : "Save and Continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
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
                <p className="text-[12px] text-gray-600 mt-2">
                  Initializing camera…
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
                {processingPhoto ? "Processing…" : "Capture"}
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
