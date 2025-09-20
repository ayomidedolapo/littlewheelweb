"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Edit3, Crown } from "lucide-react";

/* ---------- helpers (same layout, just formats/masks) ---------- */
type User = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string; // +234...
  dob?: string; // ISO
  gender?: string;
  email?: string;
  address?: string;
};

const initials = (f?: string, l?: string) =>
  ((f?.[0] ?? "") + (l?.[0] ?? "")).toUpperCase() || "U";

const formatPhone = (e164?: string) => {
  if (!e164) return "";
  const d = e164.replace(/\D/g, "");
  if (d.length <= 3) return `+${d}`;
  return `+${d.slice(0, 3)} ${d.slice(3)}`;
};

// **-**-16
const maskDob = (iso?: string) => {
  if (!iso) return "";
  const y = new Date(iso).getFullYear();
  return `**-**-${String(y).slice(-2)}`;
};

// a**@domain.com
const maskEmail = (email?: string) => {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${(local ?? "").slice(0, 1)}**@${domain}`;
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load user (adjust to your API)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/user");
        const j = await res.json().catch(() => ({}));
        if (!mounted) return;

        if (j?.success) {
          setUser({
            firstName: j.user?.firstName ?? "OLAREWAJU",
            lastName: j.user?.lastName ?? "DANIEL",
            phoneNumber: j.user?.phoneNumber ?? "+2348102778388",
            dob: j.user?.dob ?? "1992-01-16",
            gender: j.user?.gender ?? "Male",
            email: j.user?.email ?? "a@gmail.com",
            address: j.user?.address ?? "2,Church Street, Aso-rock villa",
          });
        } else {
          // safe fallback
          setUser({
            firstName: "OLAREWAJU",
            lastName: "DANIEL",
            phoneNumber: "+2348102778388",
            dob: "1992-01-16",
            gender: "Male",
            email: "a@gmail.com",
            address: "2,Church Street, Aso-rock villa",
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fullName = useMemo(
    () =>
      `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim().toUpperCase() ||
      "—",
    [user]
  );

  // open modal prefilled with current address
  const openEdit = () => {
    setEditAddress(user?.address ?? "");
    setSaveMsg(null);
    setShowEdit(true);
  };

  // save to backend, then update local UI
  const updateAddress = async () => {
    if (!editAddress.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      // Change this to your real endpoint if different:
      // e.g. PATCH /api/user/address  { address }
      const res = await fetch("/api/user/address", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: editAddress.trim() }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.success === false) {
        setSaveMsg(j?.message || "Failed to update address. Try again.");
      } else {
        setUser((u) => ({ ...(u || {}), address: editAddress.trim() }));
        setShowEdit(false);
      }
    } catch {
      setSaveMsg("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 pt-6">
        <h1 className="text-xl font-semibold text-black mb-12">
          Personal Information
        </h1>

        {/* Profile Avatar Section */}
        <div className="flex flex-col items-center mb-2">
          {/* Avatar */}
          <div className="w-16 h-16 bg-orange-300 rounded-full flex items-center justify-center mb-3">
            <span className="text-lg font-bold text-orange-900">
              {loading ? "—" : initials(user?.firstName, user?.lastName)}
            </span>
          </div>

          {/* Small icon below avatar */}
          <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center mb-6">
            <span className="text-xs text-white font-bold">@</span>
          </div>

          {/* Upgrade Button */}
          <button
            onClick={() => router.push("/dash/components/kyc")}
            className="bg-black text-white px-4 py-1.5 rounded-full flex items-center space-x-1.5 text-xs font-medium mb-8"
          >
            <Crown className="w-3 h-3 fill-white" />
            <span>Upgrade to Tier 2</span>
          </button>
        </div>

        {/* Fields (keeps your original structure) */}
        <div className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Full Name
            </label>
            <div className="text-right">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : fullName}
              </span>
            </div>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Mobile Number
            </label>
            <div className="text-right">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : formatPhone(user?.phoneNumber)}
              </span>
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Date of Birth
            </label>
            <div className="text-right">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : maskDob(user?.dob)}
              </span>
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Gender
            </label>
            <div className="text-right">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : user?.gender ?? "—"}
              </span>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Email
            </label>
            <div className="text-right">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : maskEmail(user?.email)}
              </span>
            </div>
          </div>

          {/* Address (with edit icon that opens modal) */}
          <div>
            <label className="block text-sm text-gray-700 mb-2 font-normal">
              Address
            </label>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black">
                {loading ? "…" : user?.address ?? "—"}
              </span>
              <button
                onClick={openEdit}
                className="ml-2 p-1 rounded hover:bg-gray-100"
                aria-label="Edit Address"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Popout Modal for Address ---------- */}
      {showEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4"
          onClick={() => setShowEdit(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-extrabold text-black mb-5">
              Edit Information
            </h2>

            <label className="block text-sm text-gray-700 mb-2">Address</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="2,Church Street, Aso-rock villa"
              className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300"
            />

            {saveMsg && (
              <p className="mt-3 text-[12px] text-red-600">{saveMsg}</p>
            )}

            <button
              onClick={updateAddress}
              disabled={saving || !editAddress.trim()}
              className="mt-5 w-full h-12 rounded-2xl bg-black text-white font-semibold disabled:bg-black/40"
            >
              {saving ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
