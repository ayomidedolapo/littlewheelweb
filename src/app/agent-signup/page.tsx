"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Send,
  ShieldCheck,
} from "lucide-react";

/* ---------- utils ---------- */
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/** Always return +234XXXXXXXXXX */
const toE164Plus234 = (raw: string) => {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  // If user typed local 10–11 digits without leading 0, still prefix
  return `+234${d}`;
};

const isEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());

/** Session helper */
const SESSION_COOKIE = "lw_signup_session";
function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

/* ---------- page ---------- */
type StepState =
  | "idle"
  | "sending"
  | "code_sent"
  | "verifying"
  | "verified"
  | "error";

export default function CreateAccountPage() {
  const router = useRouter();

  // inputs
  const [phoneLocal, setPhoneLocal] = useState(""); // user types local number, we render +234 tag
  const [email, setEmail] = useState("");

  // OTP state
  const [pOtp, setPOtp] = useState(["", "", "", ""]);
  const [eOtp, setEOtp] = useState(["", "", "", ""]);
  const pRefs = useRef<Array<HTMLInputElement | null>>([]);
  const eRefs = useRef<Array<HTMLInputElement | null>>([]);

  // state flags
  const [pState, setPState] = useState<StepState>("idle");
  const [eState, setEState] = useState<StepState>("idle");

  // session
  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      return (
        sessionStorage.getItem(SESSION_COOKIE) ||
        readCookie(SESSION_COOKIE) ||
        ""
      );
    } catch {
      return readCookie(SESSION_COOKIE) || "";
    }
  });

  // final submit
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // computed
  const phoneDigits = useMemo(
    () => onlyDigits(phoneLocal).slice(0, 11),
    [phoneLocal]
  );
  const phoneOk = useMemo(
    () => phoneDigits.length >= 10 && phoneDigits.length <= 11,
    [phoneDigits]
  );
  const emailOk = useMemo(() => isEmail(email), [email]);

  const canRequestPhone = phoneOk && (pState === "idle" || pState === "error");
  const canVerifyPhone = pOtp.join("").length === 4 && pState === "code_sent";
  const phoneVerified = pState === "verified";

  const canRequestEmail =
    emailOk && phoneVerified && (eState === "idle" || eState === "error");
  const canVerifyEmail = eOtp.join("").length === 4 && eState === "code_sent";
  const emailVerified = eState === "verified";

  const canCreate = phoneVerified && emailVerified && !submitting;

  function keepSession(s?: string | null) {
    if (!s) return;
    setSessionId(s);
    try {
      sessionStorage.setItem(SESSION_COOKIE, s);
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(
        s
      )}; Path=/; SameSite=Lax`;
    } catch {}
  }

  useEffect(() => {
    const c = readCookie(SESSION_COOKIE);
    if (c && c !== sessionId) keepSession(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------- step 1: request phone OTP -------- */
  const requestPhoneOtp = async () => {
    if (!canRequestPhone) return;
    setErr(null);
    setInfo(null);
    setPState("sending");
    try {
      const payload: any = {
        step: 1,
        phoneNumber: toE164Plus234(phoneDigits), // *** +234xxxx ***
      };
      if (sessionId) payload.sessionId = sessionId;

      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false)
        throw new Error(j?.message || `HTTP ${r.status}`);

      const sid =
        j?.sessionId ||
        j?.data?.sessionId ||
        readCookie(SESSION_COOKIE) ||
        sessionId;
      keepSession(sid);

      setPOtp(["", "", "", ""]);
      setPState("code_sent");
      setInfo("Phone code sent.");
      requestAnimationFrame(() => pRefs.current[0]?.focus());
    } catch (e: any) {
      setErr(e?.message || "Failed to send phone OTP.");
      setPState("error");
    }
  };

  /* -------- step 2: verify phone OTP -------- */
  const verifyPhoneOtp = async () => {
    if (!canVerifyPhone) return;
    setErr(null);
    setInfo(null);
    setPState("verifying");
    try {
      const code = pOtp.join("");
      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          step: 2,
          phoneOtp: code,
          sessionId: sessionId || undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false)
        throw new Error(j?.message || `HTTP ${r.status}`);

      const sid =
        j?.sessionId ||
        j?.data?.sessionId ||
        readCookie(SESSION_COOKIE) ||
        sessionId;
      keepSession(sid);

      setPState("verified");
      setPOtp(["", "", "", ""]);
      setInfo("Phone verified.");
    } catch (e: any) {
      setErr(e?.message || "Invalid phone code.");
      setPState("error");
    }
  };

  /* -------- step 3: request email OTP -------- */
  const requestEmailOtp = async () => {
    if (!canRequestEmail) return;
    setErr(null);
    setInfo(null);
    setEState("sending");
    try {
      const payload: any = { step: 3, email: email.trim().toLowerCase() };
      if (sessionId) payload.sessionId = sessionId;

      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false)
        throw new Error(j?.message || `HTTP ${r.status}`);

      const sid =
        j?.sessionId ||
        j?.data?.sessionId ||
        readCookie(SESSION_COOKIE) ||
        sessionId;
      keepSession(sid);

      setEOtp(["", "", "", ""]);
      setEState("code_sent");
      setInfo("Email code sent.");
      requestAnimationFrame(() => eRefs.current[0]?.focus());
    } catch (e: any) {
      setErr(e?.message || "Failed to send email OTP.");
      setEState("error");
    }
  };

  /* -------- step 4: verify email OTP -------- */
  const verifyEmailOtp = async () => {
    if (!canVerifyEmail) return;
    setErr(null);
    setInfo(null);
    setEState("verifying");
    try {
      const code = eOtp.join("");
      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          step: 4,
          emailOtp: code,
          sessionId: sessionId || undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.success === false)
        throw new Error(j?.message || `HTTP ${r.status}`);

      const sid =
        j?.sessionId ||
        j?.data?.sessionId ||
        readCookie(SESSION_COOKIE) ||
        sessionId;
      keepSession(sid);

      setEState("verified");
      setEOtp(["", "", "", ""]);
      setInfo("Email verified.");
    } catch (e: any) {
      setErr(e?.message || "Invalid email code.");
      setEState("error");
    }
  };

  /* -------- step 5: create account -------- */
  const createAccount = async () => {
    if (!canCreate) return;
    setSubmitting(true);
    setErr(null);
    setInfo(null);
    try {
      const payload = {
        step: 5,
        phoneNumber: toE164Plus234(phoneDigits), // *** +234xxxx ***
        email: email.trim().toLowerCase(),
        sessionId: sessionId || undefined,
        role: "AGENT",
        mode: "SELF_CREATED",
        deviceToken:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `dev-${Date.now()}`,
      };

      const r = await fetch("/api/auth/signup-v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok || j?.success === false) {
        throw new Error(j?.message || `HTTP ${r.status}`);
      }

      setInfo("Account created!");
      router.replace("/dash/components/settings/personal");
    } catch (e: any) {
      setErr(e?.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  /* auto-verify when 4 digits typed */
  useEffect(() => {
    if (pOtp.join("").length === 4 && pState === "code_sent") {
      verifyPhoneOtp().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pOtp]);

  useEffect(() => {
    if (eOtp.join("").length === 4 && eState === "code_sent") {
      verifyEmailOtp().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eOtp]);

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b">
        <div className="max-w-md mx-auto flex items-center gap-2 p-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[15px] font-bold">Create your agent account</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">
        {/* PHONE */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-gray-800">
            Phone number *
          </label>
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-[12px] font-semibold">
              +234
            </span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="9032700990"
              value={phoneDigits}
              onChange={(e) => {
                setPhoneLocal(e.target.value);
                if (pState !== "verified") setPState("idle");
                setErr(null);
                setInfo(null);
              }}
              className="flex-1 h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={requestPhoneOtp}
              disabled={!canRequestPhone}
              className={`h-10 px-3 rounded-lg text-sm font-semibold ${
                !canRequestPhone
                  ? "bg-gray-200 text-gray-500"
                  : "bg-black text-white"
              }`}
            >
              {pState === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            {pState === "verified" && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Verified
              </span>
            )}
          </div>

          {(pState === "code_sent" ||
            pState === "verifying" ||
            pState === "error") && (
            <div>
              <p className="text-[11px] text-gray-700 mb-1">
                Enter 4-digit code sent to your phone
              </p>
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={`p-${i}`}
                    ref={(el) => (pRefs.current[i] = el)}
                    value={pOtp[i]}
                    onChange={(e) => {
                      const d = onlyDigits(e.target.value).slice(0, 1);
                      const next = [...pOtp];
                      next[i] = d;
                      setPOtp(next);
                      if (d && i < 3) pRefs.current[i + 1]?.focus();
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    className="w-11 h-11 rounded-lg border border-gray-300 text-center text-[16px] font-semibold"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* EMAIL */}
        <div className="space-y-2 opacity-100">
          <label className="text-[12px] font-semibold text-gray-800">
            Email *
          </label>
          <input
            type="email"
            placeholder="john@doe.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (eState !== "verified") setEState("idle");
              setErr(null);
              setInfo(null);
            }}
            className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none"
            autoCapitalize="none"
            autoCorrect="off"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={requestEmailOtp}
              disabled={!canRequestEmail}
              className={`h-10 px-3 rounded-lg text-sm font-semibold ${
                !canRequestEmail
                  ? "bg-gray-200 text-gray-500"
                  : "bg-black text-white"
              }`}
              title={!phoneVerified ? "Verify phone first" : ""}
            >
              {eState === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            {eState === "verified" && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Verified
              </span>
            )}
          </div>

          {(eState === "code_sent" ||
            eState === "verifying" ||
            eState === "error") && (
            <div>
              <p className="text-[11px] text-gray-700 mb-1">
                Enter 4-digit code sent to your email
              </p>
              <div className="flex items-center gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={`e-${i}`}
                    ref={(el) => (eRefs.current[i] = el)}
                    value={eOtp[i]}
                    onChange={(e) => {
                      const d = onlyDigits(e.target.value).slice(0, 1);
                      const next = [...eOtp];
                      next[i] = d;
                      setEOtp(next);
                      if (d && i < 3) eRefs.current[i + 1]?.focus();
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    className="w-11 h-11 rounded-lg border border-gray-300 text-center text-[16px] font-semibold"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STATUS */}
        {sessionId && (
          <div className="text-[11px] text-gray-600 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> session:{" "}
            <span className="font-mono">{sessionId}</span>
          </div>
        )}
        {info && <p className="text-[12px] text-emerald-700">{info}</p>}
        {err && <p className="text-[12px] text-rose-600">{err}</p>}

        {/* CREATE (step 5) */}
        <button
          onClick={createAccount}
          disabled={!canCreate}
          className={`w-full h-12 rounded-2xl text-white font-semibold ${
            !canCreate ? "bg-gray-300" : "bg-black active:scale-[0.99]"
          }`}
          title={
            !phoneVerified
              ? "Verify phone"
              : !emailVerified
              ? "Verify email"
              : ""
          }
        >
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Creating…
            </span>
          ) : (
            "Create account"
          )}
        </button>
      </div>
    </div>
  );
}
