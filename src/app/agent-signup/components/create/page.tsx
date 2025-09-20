"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone as PhoneIcon,
  Mail as MailIcon,
  CheckCircle2,
} from "lucide-react";

/** Routes */
const LOGIN_ROUTE = "/agent-login";
const NEXT_STEP_ROUTE = "/agent-signup/components/personal-details";

/** Optional reCAPTCHA */
const RECAPTCHA_SITE_KEY =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
  "6LeVK6wqAAAAAOwOobMbFE4LgsjJi1cX6rgmXzpm";

async function getCaptchaToken(action: string): Promise<string | null> {
  try {
    const g: any = (globalThis as any).grecaptcha;
    if (!g || !RECAPTCHA_SITE_KEY) return null;
    await new Promise<void>((resolve) => g.ready(() => resolve()));
    const token = await g.execute(RECAPTCHA_SITE_KEY, { action });
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Helpers */
const digitsOnly = (s: string) => s.replace(/\D/g, "");
const toE164 = (raw: string) => {
  const d = digitsOnly(raw);
  const local = d.startsWith("0") ? d.slice(1) : d;
  return `+234${local}`;
};
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Per-tab storage keys */
const SKEY = {
  SESSION_ID: "lw_flow_sessionId",
  PHONE: "lw_flow_phone",
  EMAIL: "lw_flow_email",
};
/** Shared device token */
const LKEY = { DEVICE: "lw_device_token" };

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

type StepState =
  | "idle"
  | "sending"
  | "code_sent"
  | "verifying"
  | "verified"
  | "error";

/** visual state for OTP inputs */
const otpBorder = (state: StepState) =>
  state === "verified"
    ? "border-emerald-500"
    : state === "error"
    ? "border-red-500"
    : "border-gray-300";

/** ---------- token helpers ---------- */
function getToken(data: any): string | null {
  return (
    data?.token ||
    data?.access_token ||
    data?.accessToken ||
    data?.data?.token ||
    data?.data?.access_token ||
    data?.data?.accessToken ||
    data?.data?.data?.token ||
    data?.data?.data?.access_token ||
    data?.data?.data?.accessToken ||
    null
  );
}

function persistToken(tok: string | null | undefined) {
  if (!tok) return;
  try {
    localStorage.setItem("lw_token", tok);
    document.cookie = `lw_token=${encodeURIComponent(
      tok
    )}; Path=/; SameSite=Lax`;
  } catch {}
}

/** 🔁 exchange the 4-digit phone OTP for a V1 token (so /v1/* accepts us) */
async function bridgeV1Token(e164: string, otp: string) {
  try {
    console.log("Attempting to bridge V1 token...", { phone: e164 });

    const r = await fetch("/api/auth/bridge-v1-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phoneNumber: e164, otp }),
      credentials: "include",
    });

    const j = await r.json().catch(() => ({}));
    console.log("Bridge V1 response:", { status: r.status, data: j });

    const t =
      j?.token ||
      j?.data?.token ||
      j?.data?.access_token ||
      j?.access_token ||
      null;

    if (t && r.ok) {
      console.log("Successfully bridged V1 token");
      persistToken(t);
      return t;
    } else {
      console.warn("Bridge V1 failed:", j?.message || "No token received");
      return null;
    }
  } catch (error) {
    console.error("Bridge V1 error:", error);
    return null;
  }
}

export default function CreateExactDualOTP() {
  const router = useRouter();

  /** device token */
  const [deviceToken, setDeviceToken] = useState("web-client");
  useEffect(() => {
    try {
      const existing = localStorage.getItem(LKEY.DEVICE);
      if (existing) setDeviceToken(existing);
      else {
        const gen = newId();
        localStorage.setItem(LKEY.DEVICE, gen);
        setDeviceToken(gen);
      }
    } catch {}
  }, []);

  /** session + inputs */
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SKEY.SESSION_ID) || "";
    } catch {
      return "";
    }
  });

  const [phone, setPhone] = useState<string>(() => {
    try {
      const p = sessionStorage.getItem(SKEY.PHONE);
      return p ? p.replace(/^\+?234/, "") : "";
    } catch {
      return "";
    }
  });
  const [email, setEmail] = useState<string>(() => {
    try {
      return sessionStorage.getItem(SKEY.EMAIL) || "";
    } catch {
      return "";
    }
  });

  /** states */
  const [pageError, setPageError] = useState<string | null>(null);

  const [pState, setPState] = useState<StepState>("idle");
  const [eState, setEState] = useState<StepState>("idle");

  const [pOtp, setPOtp] = useState<string[]>(["", "", "", ""]);
  const [eOtp, setEOtp] = useState<string[]>(["", "", "", ""]);

  const pRefs = useRef<Array<HTMLInputElement | null>>([]);
  const eRefs = useRef<Array<HTMLInputElement | null>>([]);

  /** validation */
  const phoneIsValid = useMemo(() => {
    const d = digitsOnly(phone);
    return d.length >= 10 && d.length <= 11;
  }, [phone]);
  const emailIsValid = useMemo(() => isValidEmail(email), [email]);

  /** continue when BOTH verified and sessionId exists */
  const canContinue = pState === "verified" && !!sessionId;

  /** helpers */
  const saveSessionId = (sid: string | null | undefined) => {
    if (!sid) return;
    setSessionId(sid);
    try {
      sessionStorage.setItem(SKEY.SESSION_ID, sid);
    } catch {}
  };
  const persistInputs = (e164: string, cleanEmail: string) => {
    try {
      sessionStorage.setItem(SKEY.PHONE, e164);
      sessionStorage.setItem(SKEY.EMAIL, cleanEmail);
    } catch {}
  };

  async function callSignupV2(body: Record<string, any>) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort("timeout"), 45000);

    try {
      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(body?.sessionId
            ? { "x-session-id": String(body.sessionId) }
            : {}),
          ...(body?.otpChannel
            ? { "x-otp-channel": String(body.otpChannel) }
            : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
        credentials: "include",
        signal: ac.signal,
      });
      const raw = await r.text();
      let data: any;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = { message: raw };
      }
      return { r, data };
    } catch (e: any) {
      return {
        r: { ok: false, status: 0 } as Response,
        data: { success: false, message: e?.message || "Network error" },
      };
    } finally {
      clearTimeout(t);
    }
  }

  /** ---------- PHONE (force SMS channel) ---------- */
  const sendPhoneCode = async () => {
    if (!phoneIsValid || pState === "sending" || pState === "verifying") return;
    setPageError(null);

    const e164 = toE164(phone);
    const cleanEmail = email.trim().toLowerCase();
    persistInputs(e164, cleanEmail);

    const captchaToken = await getCaptchaToken("send_phone_code");

    const payload: any = {
      step: 1,
      phoneNumber: e164,
      ...(cleanEmail ? { email: cleanEmail } : {}),
      otpChannel: "sms",
      role: "AGENT",
      mode: "SELF_CREATED",
      deviceToken,
      ...(captchaToken ? { captchaToken } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    setPState("sending");
    const { r, data } = await callSignupV2(payload);

    if (!r.ok || data?.success === false) {
      setPState("error");
      setPageError(
        data?.message ||
          data?.data?.message ||
          "Couldn’t send phone code. Try again."
      );
      return;
    }

    saveSessionId(
      data?.sessionId || data?.data?.sessionId || data?.data?.data?.sessionId
    );
    setPOtp(["", "", "", ""]);
    setPState("code_sent");
    requestAnimationFrame(() => pRefs.current[0]?.focus());
  };

  const verifyPhoneCode = async () => {
    const code = pOtp.join("");
    if (code.length !== 4 || pState === "verifying") return;

    const e164 = toE164(phone);
    const captchaToken = await getCaptchaToken("verify_phone");

    const payload: any = {
      step: 1,
      phoneNumber: e164,
      phoneOtp: code,
      otpChannel: "sms",
      role: "AGENT",
      mode: "SELF_CREATED",
      deviceToken,
      ...(captchaToken ? { captchaToken } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    setPState("verifying");
    const { r, data } = await callSignupV2(payload);

    if (!r.ok || data?.success === false) {
      setPState("error");
      setPageError(
        data?.message ||
          data?.data?.message ||
          (r.status === 401
            ? "Phone session expired. Get code again."
            : "Invalid phone code.")
      );
      return;
    }

    // The V2 token should work for V1 endpoints too
    const token = getToken(data);
    if (token) {
      console.log(
        "Got token from V2 phone verification:",
        token.substring(0, 20) + "..."
      );
      persistToken(token);
    } else {
      console.warn("No token received from V2 verification");
    }

    // Save session
    const newSessionId =
      data?.sessionId || data?.data?.sessionId || data?.data?.data?.sessionId;
    if (newSessionId) {
      saveSessionId(newSessionId);
    }

    setPState("verified");
    setPOtp(["", "", "", ""]);
    pRefs.current[3]?.blur();

    console.log("Phone verification complete", {
      hasToken: !!token,
      sessionId: newSessionId || sessionId,
    });
  };

  const resendPhoneCode = async () => {
    if (!phoneIsValid) return;
    await sendPhoneCode();
  };

  /** ---------- EMAIL (force EMAIL channel) ---------- */
  const sendEmailCode = async () => {
    if (!emailIsValid || eState === "sending" || eState === "verifying") return;
    setPageError(null);

    const cleanEmail = email.trim().toLowerCase();

    setEState("sending");

    // Try minimal payload - maybe backend expects different structure
    const minimalPayload = {
      step: 1,
      email: cleanEmail,
      role: "AGENT",
      mode: "SELF_CREATED",
      deviceToken,
      ...(sessionId ? { sessionId } : {}),
    };

    console.log("Trying minimal email payload:", minimalPayload);

    const { r, data } = await callSignupV2(minimalPayload);

    if (!r.ok || data?.success === false) {
      setEState("error");
      setPageError(
        `Email verification unavailable. Please proceed with phone verification only.`
      );
      return;
    }

    saveSessionId(
      data?.sessionId || data?.data?.sessionId || data?.data?.data?.sessionId
    );
    setEOtp(["", "", "", ""]);
    setEState("code_sent");
    requestAnimationFrame(() => eRefs.current[0]?.focus());
  };

  const verifyEmailCode = async () => {
    const code = eOtp.join("");
    if (code.length !== 4 || eState === "verifying") return;

    const cleanEmail = email.trim().toLowerCase();
    const e164 = phoneIsValid ? toE164(phone) : undefined;
    const captchaToken = await getCaptchaToken("verify_email");

    const payload: any = {
      step: 1,
      ...(e164 ? { phoneNumber: e164 } : {}),
      email: cleanEmail,
      emailOtp: code,
      otpChannel: "email",
      channel: "EMAIL",
      otpType: "EMAIL",
      via: "EMAIL",
      role: "AGENT",
      mode: "SELF_CREATED",
      deviceToken,
      ...(captchaToken ? { captchaToken } : {}),
      ...(sessionId ? { sessionId } : {}),
    };

    setEState("verifying");
    const { r, data } = await callSignupV2(payload);

    if (!r.ok || data?.success === false) {
      setEState("error");
      setPageError(
        data?.message ||
          data?.data?.message ||
          (r.status === 401
            ? "Email session expired. Send code again."
            : "Invalid email code.")
      );
      return;
    }

    // Persist any token backend may issue here (some do after both OTPs)
    persistToken(getToken(data));

    saveSessionId(
      data?.sessionId || data?.data?.sessionId || data?.data?.data?.sessionId
    );
    setEState("verified");
    setEOtp(["", "", "", ""]);
    eRefs.current[3]?.blur();
  };

  const resendEmailCode = async () => {
    if (!emailIsValid) return;
    await sendEmailCode();
  };

  /** OTP inputs */
  const setBox = (i: number, v: string, which: "phone" | "email") => {
    const d = digitsOnly(v).slice(0, 1);
    if (which === "phone") {
      const next = [...pOtp];
      next[i] = d;
      setPOtp(next);
      if (pState === "error") setPState("code_sent");
      if (d && i < 3) pRefs.current[i + 1]?.focus();
    } else {
      const next = [...eOtp];
      next[i] = d;
      setEOtp(next);
      if (eState === "error") setEState("code_sent");
      if (d && i < 3) eRefs.current[i + 1]?.focus();
    }
  };

  const onPasteOtp = (
    e: React.ClipboardEvent<HTMLDivElement>,
    which: "phone" | "email"
  ) => {
    const text = digitsOnly(e.clipboardData.getData("text") || "");
    if (!text) return;
    e.preventDefault();
    const arr = text.slice(0, 4).split("");
    while (arr.length < 4) arr.push("");
    if (which === "phone") setPOtp(arr);
    else setEOtp(arr);
  };

  /** Auto-verify when 4 digits present */
  useEffect(() => {
    if (
      pOtp.join("").length === 4 &&
      pState !== "verifying" &&
      pState !== "verified"
    ) {
      verifyPhoneCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pOtp]);

  useEffect(() => {
    if (
      eOtp.join("").length === 4 &&
      eState !== "verifying" &&
      eState !== "verified"
    ) {
      verifyEmailCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eOtp]);

  const onBoxKey = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    which: "phone" | "email"
  ) => {
    const arr = which === "phone" ? pOtp : eOtp;
    const refs = which === "phone" ? pRefs : eRefs;
    if (e.key === "Backspace") {
      if (arr[i]) {
        const next = [...arr];
        next[i] = "";
        which === "phone" ? setPOtp(next) : setEOtp(next);
        return;
      }
      if (i > 0) refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 3) refs.current[i + 1]?.focus();
  };

  /** Continue */

  // And update the goNext function:
  const goNext = () => {
    if (!canContinue) return;

    // Save the email for later use in personal details
    try {
      sessionStorage.setItem("lw_flow_email", email.trim().toLowerCase());
    } catch {}

    router.push(
      `${NEXT_STEP_ROUTE}?sessionId=${encodeURIComponent(sessionId)}`
    );
  };

  /** UI (unchanged look) */
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-2xl md:shadow-xl overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="flex items-center px-4 pt-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-[13px] text-gray-700 hover:text-gray-900"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-gray-100 mr-2">
              <ArrowLeft className="w-4 h-4" />
            </span>
            Back
          </button>
        </div>

        {/* Body */}
        <div className="px-4">
          <h1 className="mt-2 text-[18px] font-extrabold text-gray-900">
            Let’s Get Started
          </h1>
          <p className="text-[12px] text-gray-600 mt-1">
            Enter your phone number to get rolling with Little Wheel
          </p>

          {/* Mobile Number */}
          <label className="block mt-5 text-[12px] font-semibold text-gray-900">
            Mobile Number
          </label>

          {/* Phone input row */}
          <div className="mt-2">
            <div className="flex items-center gap-2">
              {/* +234 pill */}
              <div className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-2">
                <div className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-gray-200">
                  <Image
                    src="https://flagpedia.net/data/flags/w580/ng.png"
                    width={20}
                    height={20}
                    alt="NG"
                    className="w-5 h-5"
                  />
                </div>
                <span className="text-[12px] font-semibold text-gray-900">
                  +234
                </span>
              </div>

              {/* number input (relative for button on the right) */}
              <div className="relative flex-1">
                <div className="flex items-center gap-2 rounded-md px-3 py-2 bg-gray-100">
                  <PhoneIcon className="w-4 h-4 text-gray-900" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="9032700990"
                    value={phone}
                    readOnly={pState === "verified"}
                    onChange={(e) => {
                      setPhone(digitsOnly(e.target.value).slice(0, 11));
                      if (pState !== "verified") setPState("idle");
                      setPageError(null);
                    }}
                    className="flex-1 bg-transparent outline-none text-[12px] text-gray-900 placeholder-gray-400 pr-10"
                  />
                </div>

                {/* right action INSIDE the input */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {pState === "verified" ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={sendPhoneCode}
                      disabled={
                        !phoneIsValid ||
                        pState === "sending" ||
                        pState === "verifying" ||
                        pState === "verified"
                      }
                      className={`text-[12px] font-semibold ${
                        !phoneIsValid ||
                        pState === "sending" ||
                        pState === "verifying" ||
                        pState === "verified"
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-emerald-600"
                      }`}
                    >
                      {pState === "sending" ? "Sending…" : "Get code"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Phone OTP area */}
            {(pState === "code_sent" ||
              pState === "verifying" ||
              pState === "error") && (
              <div className="mt-3" onPaste={(e) => onPasteOtp(e, "phone")}>
                <p className="text-[11px] text-gray-800 mb-2">
                  Enter 4-digits code sent to your number
                </p>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        ref={(el) => (pRefs.current[i] = el)}
                        value={pOtp[i]}
                        onChange={(e) => setBox(i, e.target.value, "phone")}
                        onKeyDown={(e) => onBoxKey(i, e, "phone")}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        disabled={pState === "verified"}
                        className={`w-12 h-12 rounded-[10px] border ${otpBorder(
                          pState
                        )} bg-white text-center text-[18px] font-semibold outline-none`}
                      />
                    ))}
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500">
                    {pState === "verifying" ? (
                      <span className="text-gray-700">Verifying…</span>
                    ) : pState === "error" ? (
                      <span className="text-red-600">Invalid code.</span>
                    ) : null}{" "}
                    {pState !== "verified" && (
                      <>
                        &nbsp;Didn’t receive OTP?{" "}
                        <button
                          type="button"
                          onClick={resendPhoneCode}
                          disabled={pState === "verified" || !phoneIsValid}
                          className={`underline underline-offset-2 ${
                            pState === "verified" || !phoneIsValid
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-gray-900"
                          }`}
                        >
                          Resend code
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Email */}
          <label className="block mt-5 text-[12px] font-semibold text-gray-900">
            Email
          </label>

          {/* Email input row (button inside right) */}
          <div className="mt-2">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2">
                <MailIcon className="w-4 h-4 text-gray-900" />
                <input
                  type="email"
                  placeholder="test@gmail.com"
                  value={email}
                  readOnly={eState === "verified"}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (eState !== "verified") setEState("idle");
                    setPageError(null);
                  }}
                  className="flex-1 bg-transparent outline-none text-[12px] text-gray-900 placeholder-gray-400 pr-24"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {eState === "verified" ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={
                      eState === "sending" ||
                      eState === "verifying" ||
                      eState === "verified" ||
                      !emailIsValid
                    }
                    className={`text-[12px] font-semibold ${
                      eState === "sending" ||
                      eState === "verifying" ||
                      eState === "verified" ||
                      !emailIsValid
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-emerald-600"
                    }`}
                  >
                    {eState === "sending" ? "Sending…" : "Verify email"}
                  </button>
                )}
              </div>
            </div>

            {(eState === "code_sent" ||
              eState === "verifying" ||
              eState === "error") && (
              <div className="mt-3" onPaste={(e) => onPasteOtp(e, "email")}>
                <p className="text-[11px] text-gray-800 mb-2">
                  Enter 4-digits code sent to your email
                </p>

                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-4">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        ref={(el) => (eRefs.current[i] = el)}
                        value={eOtp[i]}
                        onChange={(ev) => setBox(i, ev.target.value, "email")}
                        onKeyDown={(ev) => onBoxKey(i, ev, "email")}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        disabled={eState === "verified"}
                        className={`w-12 h-12 rounded-[10px] border ${otpBorder(
                          eState
                        )} bg-white text-center text-[18px] font-semibold outline-none`}
                      />
                    ))}
                  </div>

                  <div className="mt-2 text-[11px] text-gray-500">
                    {eState === "verifying" ? (
                      <span className="text-gray-700">Verifying…</span>
                    ) : eState === "error" ? (
                      <span className="text-red-600">Invalid code.</span>
                    ) : null}{" "}
                    {eState !== "verified" && (
                      <>
                        &nbsp;Didn’t receive OTP?{" "}
                        <button
                          type="button"
                          onClick={resendEmailCode}
                          disabled={eState === "verified" || !emailIsValid}
                          className={`underline underline-offset-2 ${
                            eState === "verified" || !emailIsValid
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-gray-900"
                          }`}
                        >
                          Resend code
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* page error */}
          {pageError && (
            <p className="mt-3 text-[11px] text-rose-600" role="alert">
              {pageError}
            </p>
          )}

          {/* login link */}
          <div className="mt-6 text-center">
            <span className="text-[12px] text-gray-700">
              Already have an account?{" "}
            </span>
            <button
              onClick={() => router.push(LOGIN_ROUTE)}
              className="text-[12px] font-semibold text-gray-900 underline underline-offset-2"
            >
              Login
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto px-4 pb-5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-gray-700">Enter your Phone Number</span>
            <span className="text-gray-500">1/4</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: "25%" }}
            />
          </div>

          <button
            onClick={goNext}
            disabled={!canContinue}
            className={`mt-4 w-full h-12 rounded-xl text-[14px] font-semibold ${
              canContinue
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
