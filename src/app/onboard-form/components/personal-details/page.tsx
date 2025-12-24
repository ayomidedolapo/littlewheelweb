"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User2,
  ChevronDown,
  Check,
  Camera as CameraIcon,
  X,
  Image as ImageIcon,
  Mail,
  RefreshCcw,
  AlertCircle,
} from "lucide-react";
import LogoSpinner from "../../../../components/loaders/LogoSpinner";

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

  const baseField =
    "w-full rounded-xl border bg-white h-12 pl-10 pr-3 text-sm outline-none transition-all duration-150 placeholder:text-gray-400";
  const labelCls =
    "text-xs font-medium text-gray-700 flex items-center gap-1 mb-1.5 tracking-wide uppercase";
  const errorCls = "mt-1 text-xs text-red-600";

  // --- Validation
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.avatarUrl.trim()) e.avatarUrl = "Profile photo is required.";
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.username.trim()) e.username = "Username is required.";
    if (!form.gender) e.gender = "Select a gender.";
    if (!form.dob) e.dob = "Date of birth is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!isEmail(form.email)) e.email = "Enter a valid email.";
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;
  const hasTouchedSomething = Object.values(touched).some(Boolean);

  const fieldHasError = (field: keyof typeof form) =>
    touched[field] && errors[field];

  const fieldClass = (field: keyof typeof form) => {
    const hasError = fieldHasError(field);
    return [
      baseField,
      hasError
        ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
        : "border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100",
    ].join(" ");
  };

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

  const avatarHasError = touched.avatarUrl && !!errors.avatarUrl;
  const dobHasError = fieldHasError("dob");

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
    // Do NOT mark avatarUrl as touched here – avoid error on just opening camera

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
      setTouched((t) => ({ ...t, avatarUrl: true }));
      closeCamera();
    } finally {
      setProcessingPhoto(false);
    }
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
        avatarUrl: form.avatarUrl.trim() || undefined,
        gender: form.gender.toUpperCase(),
        dob: form.dob,
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center px-0 py-0 md:px-6 md:py-8">
      <div
        className="
          w-full
          bg-white
          min-h-screen
          md:min-h-0
          md:max-w-5xl
          md:rounded-3xl
          md:shadow-[0_18px_60px_rgba(15,23,42,0.14)]
          md:border md:border-gray-100
          overflow-hidden
        "
      >
        {/* Top progress + header */}
        <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
          <div className="px-4 md:px-8 pt-4 pb-3 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-black" />
              Back
            </button>

            <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-16 rounded-full bg-green-500" />
              <span className="h-1.5 w-16 rounded-full bg-black" />
              <span className="h-1.5 w-16 rounded-full bg-gray-200" />
              <span className="ml-3 tracking-wide uppercase">
                Step 2 of 3 • Personal details
              </span>
            </div>
          </div>

          <div className="h-1 w-full bg-gray-100">
            <div className="h-full bg-black rounded-r-full w-2/3" />
          </div>
        </div>

        {/* Main layout */}
        <div className="px-4 md:px-8 py-6 md:py-8 grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8">
          {/* Left: form */}
          <div className="space-y-6">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gray-100 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 mb-3">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                Onboarding • Personal details
              </p>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight">
                You are almost done
              </h1>
              <p className="text-sm text-gray-600 mt-1.5">
                Provide a few details to complete this customer&apos;s account
                opening.
              </p>
            </div>

            {!isValid && hasTouchedSomething && (
              <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  Some fields need your attention. Please fix the highlighted
                  inputs.
                </p>
              </div>
            )}

            <div className="space-y-5">
              {/* Profile Photo (required) */}
              <div
                className={[
                  "rounded-2xl border px-4 py-4 bg-gray-50/70",
                  avatarHasError ? "border-red-400 bg-red-50" : "border-gray-100",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className={labelCls}>
                      Profile image<span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Capture a clear face photo of the customer.
                    </p>
                  </div>
                  {form.avatarUrl && (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.avatarUrl}
                        alt="profile preview"
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-900/10"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openCamera()}
                    className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-black bg-black text-white hover:bg-black/90 text-xs font-medium shadow-sm"
                  >
                    <CameraIcon className="w-4 h-4 text-white" />
                    {form.avatarUrl ? "Retake photo" : "Take a photo"}
                  </button>

                  {!form.avatarUrl && (
                    <div className="flex items-center gap-2 text-[11px] text-gray-600">
                      <ImageIcon className="w-4 h-4 text-black" />
                      No photo yet
                    </div>
                  )}
                </div>

                {avatarHasError && (
                  <p className="mt-2 text-xs text-red-600">
                    {errors.avatarUrl}
                  </p>
                )}
              </div>

              {/* Names row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className={labelCls}>
                    First name<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={handleChange("firstName")}
                      placeholder="John"
                      className={fieldClass("firstName")}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, firstName: true }))
                      }
                      aria-invalid={!!fieldHasError("firstName")}
                    />
                  </div>
                  {fieldHasError("firstName") && (
                    <p className={errorCls}>{errors.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className={labelCls}>
                    Last name<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={handleChange("lastName")}
                      placeholder="Doe"
                      className={fieldClass("lastName")}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, lastName: true }))
                      }
                      aria-invalid={!!fieldHasError("lastName")}
                    />
                  </div>
                  {fieldHasError("lastName") && (
                    <p className={errorCls}>{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Middle name & username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Middle Name (optional) */}
                <div>
                  <label className={labelCls}>Middle name</label>
                  <div className="relative">
                    <User2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input
                      type="text"
                      value={form.middleName}
                      onChange={handleChange("middleName")}
                      placeholder="Olu"
                      className={fieldClass("middleName")}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, middleName: true }))
                      }
                    />
                  </div>
                </div>

                {/* Username (no icon) */}
                <div>
                  <label className={labelCls}>
                    Username / nickname<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.username}
                      onChange={handleChange("username")}
                      placeholder="PappyShinzy"
                      className={fieldClass("username").replace(
                        "pl-10",
                        "pl-3"
                      )}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, username: true }))
                      }
                      aria-invalid={!!fieldHasError("username")}
                    />
                  </div>
                  {fieldHasError("username") && (
                    <p className={errorCls}>{errors.username}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>
                  Email address<span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    placeholder="john@doe.com"
                    className={fieldClass("email")}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, email: true }))
                    }
                    aria-invalid={!!fieldHasError("email")}
                  />
                </div>
                {fieldHasError("email") && (
                  <p className={errorCls}>{errors.email}</p>
                )}
              </div>

              {/* Gender + DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gender */}
                <div>
                  <label className={labelCls}>
                    Gender<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.gender}
                      onChange={handleChange("gender")}
                      className={`${fieldClass(
                        "gender"
                      )} appearance-none pr-9 cursor-pointer`}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, gender: true }))
                      }
                      aria-invalid={!!fieldHasError("gender")}
                    >
                      <option value="" disabled>
                        Select gender
                      </option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
                  </div>
                  {fieldHasError("gender") && (
                    <p className={errorCls}>{errors.gender}</p>
                  )}
                </div>

                {/* DOB – no custom image icon, only native date icon */}
                <div>
                  <label className={labelCls}>
                    Date of birth<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.dob}
                      onChange={handleChange("dob")}
                      className={[
                        baseField.replace("pl-10", "pl-3"),
                        "[color-scheme:light]",
                        dobHasError
                          ? "border-red-500 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-100"
                          : "border-gray-200 focus:border-gray-900 focus:ring-2 focus:ring-gray-100",
                      ].join(" ")}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, dob: true }))
                      }
                      aria-invalid={!!dobHasError}
                    />
                  </div>
                  {dobHasError && <p className={errorCls}>{errors.dob}</p>}
                </div>
              </div>

              {/* API error message */}
              {errorMsg && (
                <div
                  className="mt-2 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
                  role="alert"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="pt-2 pb-4 md:pb-0">
              <button
                onClick={onSubmit}
                disabled={!isValid || submitting}
                className={`w-full md:w-auto px-7 py-3.5 rounded-2xl text-sm font-semibold tracking-wide inline-flex items-center justify-center gap-2 transition-all ${
                  isValid && !submitting
                    ? "bg-black text-white hover:bg-black/90 shadow-[0_14px_30px_rgba(15,23,42,0.25)]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <LogoSpinner className="w-4 h-4" />
                    Saving details…
                  </>
                ) : (
                  "Save & continue"
                )}
              </button>
            </div>
          </div>

          {/* Right: Steps to onboard new users */}
          <aside className="md:border-l md:border-gray-100 md:pl-6">
            <div className="mt-4 md:mt-10 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 underline">
                Steps to Onboard New Users
              </h3>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      isPhoneVerified ? "bg-green-500" : "bg-gray-400"
                    }`}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    Verify Phone Number
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    Add Personal Details
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-gray-700 text-sm">
                    Add User Address
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Take a photo
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={flipCamera}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 hover:text-gray-900"
                >
                  <RefreshCcw className="w-3.5 h-3.5 text-black" />
                  {cameraFacing === "user" ? "Flip to back" : "Flip to front"}
                </button>
                <button
                  onClick={closeCamera}
                  className="text-gray-500 hover:text-gray-800"
                  aria-label="Close camera"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>
            </div>

            <div className="px-4 pt-4">
              <video
                ref={videoRef}
                className="w-full aspect-[3/4] rounded-2xl bg-black object-cover"
                playsInline
                muted
                style={{
                  transform: cameraFacing === "user" ? "scaleX(-1)" : "none",
                }}
              />
              {!videoReady && (
                <p
                  className="text-[11px] text-gray-600 mt-2 inline-flex items-center gap-2"
                  role="status"
                >
                  <LogoSpinner className="w-4 h-4" />
                  Initializing camera…
                </p>
              )}
            </div>

            <div className="p-4 flex gap-3">
              <button
                onClick={capturePhoto}
                disabled={!videoReady || processingPhoto}
                className={`flex-1 h-11 rounded-2xl text-xs font-semibold inline-flex items-center justify-center gap-2 ${
                  !videoReady || processingPhoto
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:bg-black/90"
                }`}
              >
                {processingPhoto && <LogoSpinner className="w-4 h-4" />}
                {processingPhoto ? "Processing…" : "Capture"}
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 h-11 rounded-2xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-900"
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
