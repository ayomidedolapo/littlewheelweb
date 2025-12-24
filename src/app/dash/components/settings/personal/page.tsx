/* app/dash/components/settings/personal/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Edit3, Crown, X, CheckCircle2 } from "lucide-react";
import LogoSpinner from "../../../../../components/loaders/LogoSpinner";

/* ---------------- types & helpers ---------------- */
type VirtualAccount = {
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
} | null;

type User = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  username?: string;
  phoneNumber?: string; // E.164 or raw, e.g. "+234708..." or "234708..."
  dob?: string;
  gender?: string;
  email?: string;
  address?: string;
  referralCode?: string;

  // avatars
  avatarUrl?: string;
  avatar_url?: string;
  avatar?: string;
  profileImageUrl?: string;
  imageUrl?: string;
  photoUrl?: string;
  picture?: string;

  // flags
  emailVerified?: boolean;
  numberVerified?: boolean;
  phoneVerified?: boolean;
  hasCompleteRegistration?: boolean;

  // tier & va
  accountTier?: string; // e.g., "TIER_2"
  kycTier?: number | string;
  kyc_level?: number | string;
  isTier2?: boolean;

  VirtualAccount?: VirtualAccount;
  virtualAccount?: VirtualAccount; // sometimes nested
};

const initials = (f?: string, l?: string) =>
  ((f?.[0] ?? "") + (l?.[0] ?? "")).toUpperCase() || "U";

const looksLikeDataUrl = (s?: string) =>
  !!s && /^data:image\/[a-z]+;base64,/i.test(s || "");
const isBareJpeg = (s?: string) => !!s && /^\/9j\//.test(s || "");
const normalizeImgSrc = (u?: string) => {
  if (!u) return "";
  if (looksLikeDataUrl(u)) return u;
  if (isBareJpeg(u)) return `data:image/jpeg;base64,${u}`;
  return u;
};

const yearFromDob = (dob?: string) => {
  if (!dob) return "—";
  const m = String(dob).match(/^(\d{4})/);
  if (m) return m[1];
  const y = new Date(dob).getFullYear();
  return Number.isFinite(y) ? String(y) : "—";
};

const formatPhone = (e164?: string) => {
  if (!e164) return "—";
  const d = e164.replace(/\D/g, "");
  if (!d.startsWith("234")) return `+${d}`;
  return `+${d.slice(0, 3)} ${d.slice(3)}`;
};

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/** Always return E.164 "+234..." */
const to234 = (raw: string) => {
  const d = onlyDigits(raw);
  if (d.startsWith("234")) return `+${d}`;
  if (d.startsWith("0")) return `+234${d.slice(1)}`;
  return `+234${d}`;
};

/* ---------------- data fetch ---------------- */
async function fetchMe(): Promise<User> {
  const res = await fetch("/api/user/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.message || `HTTP ${res.status}`);
  return (j?.user || j?.data || j || {}) as User;
}

function pickTier2(u: User | null | undefined) {
  if (!u) return false;
  const label = (u.accountTier || "").toString().toUpperCase();
  if (label === "TIER_2") return true;
  const k = String(u.kycTier ?? u.kyc_level ?? "").replace(/\D/g, "");
  if (k === "2") return true;
  if (u.isTier2) return true;
  return false;
}

function pickVirtual(u: User | null | undefined): VirtualAccount {
  if (!u) return null;
  return (u.VirtualAccount as any) || (u as any).virtualAccount || null;
}

/* =================== PAGE =================== */
export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // edit (email-only) modal
  const [showEdit, setShowEdit] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // upgrade modal (tier-2 flow)
  const [showUpgrade, setShowUpgrade] = useState(false);

  // load (no auto-redirect here; redirect logic lives in the modal)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await fetchMe();
        if (!mounted) return;
        setUser(u);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const avatarSrc = normalizeImgSrc(
    user?.avatarUrl ||
      user?.avatar_url ||
      user?.profileImageUrl ||
      user?.imageUrl ||
      user?.photoUrl ||
      user?.picture ||
      user?.avatar ||
      ""
  );

  const fullName = useMemo(
    () =>
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim().toUpperCase() ||
      "—",
    [user]
  );

  const isTier2 = pickTier2(user);
  const isHighestTier = isTier2; // ✅ Tier 2 is the highest tier for now

  const va = pickVirtual(user);
  const hasVaNumber = !!va?.accountNumber; // (kept for info; no longer controls button label)

  // Email edit open
  const openEdit = () => {
    setEmail(user?.email || "");
    setSaveMsg(null);
    setShowEdit(true);
  };

  const updateEmail = async () => {
    if (email && !isEmail(email)) {
      setSaveMsg("Please enter a valid email.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.success === false) {
        setSaveMsg(j?.message || "Failed to update email.");
        return;
      }
      const fresh = await fetchMe();
      setUser(fresh);
      setShowEdit(false);
    } catch {
      setSaveMsg("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const showOverlay = loading || saving; // page-level spinner

  return (
    <div className="min-h-screen bg-gray-50">
      <LogoSpinner show={showOverlay} invert />

      {/* Header */}
      <div className="bg-white">
        <div className="max-w-md mx-auto px-4 py-3">
          <button
            onClick={() => router.back()}
            className="flex items-center text-left"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 mr-2" />
            <span className="text-gray-700 text-base">Back</span>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-md mx-auto px-6 pt-6">
        <h1 className="text-xl font-semibold text-black mb-10">
          Personal Information
        </h1>

        {/* Avatar + Tier area */}
        <div className="flex flex-col items-center mb-6">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt="profile"
              className="w-16 h-16 rounded-full object-cover border mb-3"
            />
          ) : (
            <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-orange-900">
                {loading ? "—" : initials(user?.firstName, user?.lastName)}
              </span>
            </div>
          )}

          {/* ✅ Tier button: disabled when highest tier */}
          <button
            type="button"
            disabled={isHighestTier}
            onClick={() => {
              if (isHighestTier) return;
              setShowUpgrade(true);
            }}
            className={`px-4 py-1.5 rounded-full flex items-center space-x-1.5 text-xs font-medium mb-2
              ${
                isHighestTier
                  ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                  : "bg-black text-white active:scale-[0.99]"
              }`}
            title={isHighestTier ? "You are already on Tier 2" : "Upgrade to Tier 2"}
            aria-disabled={isHighestTier}
          >
            <Crown
              className={`w-3 h-3 ${
                isHighestTier ? "text-gray-700" : "fill-white"
              }`}
            />
            <span>{isHighestTier ? "Tier 2" : "Proceed to Tier 2"}</span>
          </button>

          {/* optional hint (safe; remove if you don’t want it) */}
          {/* {isTier2 && !hasVaNumber ? (
            <p className="text-[11px] text-gray-500">
              Tier 2 active. Virtual account will appear once assigned.
            </p>
          ) : null} */}
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <RowSmall label="Full Name" value={loading ? "…" : fullName} />
          <RowSmall
            label="Mobile Number"
            value={loading ? "…" : formatPhone(user?.phoneNumber)}
          />
          <RowSmall
            label="Date of Birth"
            value={loading ? "…" : yearFromDob(user?.dob)}
          />
          <RowSmall
            label="Gender"
            value={loading ? "…" : user?.gender || "—"}
          />

          {/* Email row with edit icon ONLY */}
          <div>
            <label className="block text-[12px] text-gray-600 mb-1">Email</label>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={openEdit}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Edit email"
                title="Edit email"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-medium text-black truncate max-w-[70%] text-right">
                {loading ? "…" : user?.email || "—"}
              </span>
            </div>
          </div>

          <RowSmall label="Address" value={loading ? "…" : user?.address || "—"} />

          {/* Referral code just under the list */}
          <RowSmall
            label="Referral Code"
            value={loading ? "…" : user?.referralCode || "—"}
          />
        </div>
      </div>

      {/* -------- Email Edit Modal (simple) -------- */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-black mb-4">
              Update Email
            </h2>

            <div className="mb-3">
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@gmail.com"
                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {saveMsg && <p className="mt-1 text-[12px] text-rose-600">{saveMsg}</p>}

            <button
              onClick={updateEmail}
              disabled={saving}
              className="mt-3 w-full h-12 rounded-2xl bg-black text-white font-semibold disabled:bg-black/40"
            >
              {saving ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      )}

      {/* -------- Tier 2 Upgrade / Complete Setup Modal -------- */}
      <UpgradeToTier2Modal
        open={showUpgrade}
        onClose={async () => {
          setShowUpgrade(false);
          try {
            const fresh = await fetchMe();
            setUser(fresh);
          } catch {}
        }}
        mePhone={user?.phoneNumber}
        meEmail={user?.email}
        meMiddleName={user?.middleName}
      />
    </div>
  );
}

/* Small row component */
function RowSmall({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] text-gray-600">{label}</span>
        <span className="text-sm font-medium text-black text-right max-w-[70%] truncate">
          {value}
        </span>
      </div>
    </div>
  );
}

/* =================================================================== */
/*                       UpgradeToTier2Modal                            */
/* =================================================================== */
type StepState =
  | "idle"
  | "sending"
  | "code_sent"
  | "verifying"
  | "verified"
  | "error";

function isEmailAddr(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function UpgradeToTier2Modal({
  open,
  onClose,
  mePhone = "",
  meEmail = "",
  meMiddleName = "",
}: {
  open: boolean;
  onClose: () => void;
  mePhone?: string;
  meEmail?: string;
  meMiddleName?: string;
}) {
  const router = useRouter();

  // What does backend already have?
  const backendHasPhone = !!onlyDigits(mePhone || "");
  const backendHasEmail = !!(meEmail || "").trim();
  const backendHasMiddle = !!(meMiddleName || "").trim();

  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      return sessionStorage.getItem("lw_tier2_session") || "";
    } catch {
      return "";
    }
  });

  // Prefill middle name from backend if present
  const [middleName, setMiddleName] = useState(meMiddleName || "");

  // UI displays local 10/11-digit phone; we strip 234 if present for the input
  const [phone, setPhone] = useState<string>(() =>
    mePhone ? onlyDigits(mePhone).replace(/^234/, "") : ""
  );
  const [email, setEmail] = useState<string>(meEmail || "");

  // Initialize states to "verified" if backend already has them
  const [pState, setPState] = useState<StepState>(
    backendHasPhone ? "verified" : "idle"
  );
  const [eState, setEState] = useState<StepState>(
    backendHasEmail ? "verified" : "idle"
  );

  const [pOtp, setPOtp] = useState(["", "", "", ""]);
  const [eOtp, setEOtp] = useState(["", "", "", ""]);
  const pRefs = useRef<Array<HTMLInputElement | null>>([]);
  const eRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const phoneOk = useMemo(() => {
    const d = onlyDigits(phone);
    return d.length >= 10 && d.length <= 11;
  }, [phone]);
  const emailOk = useMemo(() => isEmailAddr(email), [email]);

  const needPhone = !backendHasPhone;
  const needEmail = !backendHasEmail;
  const middleOk = !!middleName.trim() || backendHasMiddle;

  // If everything needed is already present, auto-redirect
  useEffect(() => {
    if (!open) return;
    const allGood = backendHasPhone && backendHasEmail && middleOk;
    if (allGood) {
      const t = setTimeout(() => {
        router.replace("/dash/components/kyc");
      }, 350);
      return () => clearTimeout(t);
    }
  }, [open, backendHasPhone, backendHasEmail, middleOk, router]);

  const canSubmit =
    middleOk &&
    (!needPhone || pState === "verified") &&
    (!needEmail || eState === "verified");

  const keepSession = (sid?: string | null) => {
    if (!sid) return;
    setSessionId(sid);
    try {
      sessionStorage.setItem("lw_tier2_session", sid);
    } catch {}
  };

  // prepare when opened
  useEffect(() => {
    if (!open) return;
    setErr(null);

    if (mePhone && !phone) setPhone(onlyDigits(mePhone).replace(/^234/, ""));
    if (meEmail && !email) setEmail(meEmail);
    if (meMiddleName && !middleName) setMiddleName(meMiddleName);

    if (backendHasPhone) setPState("verified");
    if (backendHasEmail) setEState("verified");
  }, [open, mePhone, meEmail, meMiddleName]); // eslint-disable-line

  // auto verify on 4 digits
  useEffect(() => {
    if (
      pOtp.join("").length === 4 &&
      pState !== "verifying" &&
      pState !== "verified"
    ) {
      verifyPhoneOtp().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pOtp]);

  useEffect(() => {
    if (
      eOtp.join("").length === 4 &&
      eState !== "verifying" &&
      eState !== "verified"
    ) {
      verifyEmailOtp().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eOtp]);

  async function callCompleteProfile(payload: any) {
    const withSid = { ...(sessionId ? { sessionId } : {}), ...payload };
    const r = await fetch("/api/user/complete-profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(withSid),
    });

    const text = await r.text();
    let j: any = {};
    try {
      j = text ? JSON.parse(text) : {};
    } catch {
      j = { message: text };
    }

    const respSid = j?.sessionId || j?.data?.sessionId;
    if (respSid) keepSession(respSid);

    if (r.status === 409) return j || { ok: true, ignored: true };
    if (!r.ok || j?.success === false) {
      throw new Error(j?.message || `HTTP ${r.status}`);
    }
    return j;
  }

  const requestPhoneOtp = async () => {
    if (!phoneOk || pState === "sending") return;
    setErr(null);
    setPState("sending");
    await callCompleteProfile({
      step: 1,
      phoneNumber: to234(phone),
    });
    setPOtp(["", "", "", ""]);
    setPState("code_sent");
    requestAnimationFrame(() => pRefs.current[0]?.focus());
  };

  const verifyPhoneOtp = async () => {
    const code = pOtp.join("");
    if (code.length !== 4 || pState === "verifying" || pState === "verified")
      return;
    setPState("verifying");
    try {
      await callCompleteProfile({ step: 2, phoneOtp: code });
      setPState("verified");
      setPOtp(["", "", "", ""]);
      pRefs.current[3]?.blur();
    } catch (e: any) {
      setPState("error");
      setErr(e?.message || "Invalid phone code.");
    }
  };

  const requestEmailOtp = async () => {
    if (!emailOk || eState === "sending") return;
    setErr(null);
    setEState("sending");
    await callCompleteProfile({
      step: 3,
      email: email.trim().toLowerCase(),
    });
    setEOtp(["", "", "", ""]);
    setEState("code_sent");
    requestAnimationFrame(() => eRefs.current[0]?.focus());
  };

  const verifyEmailOtp = async () => {
    const code = eOtp.join("");
    if (code.length !== 4 || eState === "verifying" || eState === "verified")
      return;
    setEState("verifying");
    try {
      await callCompleteProfile({ step: 4, emailOtp: code });
      setEState("verified");
      setEOtp(["", "", "", ""]);
      eRefs.current[3]?.blur();
    } catch (e: any) {
      setEState("error");
      setErr(e?.message || "Invalid email code.");
    }
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setErr(null);
    try {
      await callCompleteProfile({
        step: 5,
        phoneNumber: to234(phone || mePhone || ""),
        email: (email || meEmail || "").trim().toLowerCase(),
        role: "AGENT",
        mode: "SELF_CREATED",
        middleName: (middleName || meMiddleName || "").trim(),
      });
      router.replace("/dash/components/kyc");
    } catch (e: any) {
      setErr(e?.message || "Couldn’t complete profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const modalOverlayOn =
    submitting ||
    pState === "sending" ||
    pState === "verifying" ||
    eState === "sending" ||
    eState === "verifying";

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <LogoSpinner show={open && modalOverlayOn} invert />

      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="p-4 pb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-extrabold text-gray-900">
            Secure Your Tier 2 Access
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="px-4 pb-5 space-y-3">
          {/* Middle name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-800 mb-1">
              Middle Name*
            </label>
            <input
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="e.g John"
              className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-800 mb-1">
              Mobile Number*
            </label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-[12px] font-semibold">
                +234
              </span>
              <div className="relative flex-1">
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="9032700990"
                  value={phone}
                  onChange={(e) => {
                    setPhone(onlyDigits(e.target.value).slice(0, 11));
                    if (needPhone) setPState("idle");
                    setErr(null);
                  }}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none pr-24"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {pState === "verified" ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={requestPhoneOtp}
                      disabled={
                        !phoneOk ||
                        pState === "sending" ||
                        pState === "verifying" ||
                        !needPhone
                      }
                      className={`text-[12px] font-semibold ${
                        !phoneOk || !needPhone
                          ? "text-gray-400"
                          : "text-emerald-700"
                      }`}
                    >
                      {pState === "sending" ? "Sending…" : "Get code"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(pState === "code_sent" ||
              pState === "verifying" ||
              pState === "error") &&
              needPhone && (
                <div className="mt-2">
                  <p className="text-[11px] text-gray-800 mb-1">
                    Enter 4-digits code sent to your number
                  </p>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
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

          {/* Email */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-800 mb-1">
              Email*
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="test@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (needEmail) setEState("idle");
                  setErr(null);
                }}
                className="w-full h-11 rounded-xl border border-gray-200 px-3 text-[13px] outline-none pr-28"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {eState === "verified" ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestEmailOtp}
                    disabled={
                      !emailOk ||
                      eState === "sending" ||
                      eState === "verifying" ||
                      !needEmail
                    }
                    className={`text-[12px] font-semibold ${
                      !emailOk || !needEmail
                        ? "text-gray-400"
                        : "text-emerald-700"
                    }`}
                  >
                    {eState === "sending" ? "Sending…" : "Verify email"}
                  </button>
                )}
              </div>
            </div>

            {(eState === "code_sent" ||
              eState === "verifying" ||
              eState === "error") &&
              needEmail && (
                <div className="mt-2">
                  <p className="text-[11px] text-gray-800 mb-1">
                    Enter 4-digits code sent to your email
                  </p>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
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

          {err && <p className="text-[12px] text-rose-600">{err}</p>}

          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className={`mt-2 mb-3 w-full h-11 rounded-xl text-white font-semibold ${
              !canSubmit || submitting ? "bg-gray-300" : "bg-black"
            }`}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
