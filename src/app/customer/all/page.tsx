/* app/customer/all/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  Check,
  Phone,
  User,
  AtSign,
  Search as SearchIcon,
  RotateCcw,
} from "lucide-react";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

/* ---------- overlay using shared LogoSpinner ---------- */
// function LoadingOverlay({
//   show,
//   label = "Loading…",
// }: {
//   show: boolean;
//   label?: string;
// }) {
//   if (!show) return null;
//   return (
//     <div
//       role="status"
//       aria-live="polite"
//       className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
//     >
//       <div className="rounded-xl bg-white px-4 py-3 shadow-2xl flex items-center gap-3">
//         <LogoSpinner />
//         <span className="text-[13px] font-semibold text-gray-900">{label}</span>
//       </div>
//     </div>
//   );
// }

/* -------- shared types & helpers -------- */
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  phoneNumber?: string;
  createdAt?: string;
  vaultBalance?: number | null;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  avatar?: string | null;
  email?: string | null;
  username?: string | null;
};

type APIVault = {
  id?: string;
  vaultId?: string;
  _id?: string;
  name?: string;
  targetAmount?: number;
  amount?: number;
};

const C = {
  deposit: "#0F973D",
  vault: "#1671D9",
  withdraw: "#D42620",
};

function fmtNairaCompact(v?: number | null) {
  if (typeof v !== "number") return "₦0.00";
  if (Math.abs(v) < 1000) {
    return `₦${v.toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `₦${new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v)}`;
}
function uniq<T>(arr: T[], key: (t: T) => string) {
  const seen = new Set<string>();
  return arr.filter((it) =>
    seen.has(key(it)) ? false : (seen.add(key(it)), true)
  );
}
const s = (v: any) => (v == null ? "" : String(v));

function setActiveCustomer(id: string) {
  try {
    sessionStorage.setItem("lw_active_customer_id", id);
    sessionStorage.removeItem("lw_onboarding_customer_id");
  } catch {}
}

function extractArray(payload: any): any[] {
  const d = payload?.data ?? payload;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

/* ---------- phone helpers ---------- */
// Display without +234/234 and without a leading 0 afterwards
function displayPhoneLocal(input?: string) {
  const digits = (input || "").replace(/\D/g, "");
  let v = digits;
  if (v.startsWith("234")) v = v.slice(3);
  if (v.startsWith("0")) v = v.slice(1);
  return v || "—";
}

/* ---------- caching for vault balances ---------- */
type BalanceCache = Record<string, number>; // customerId -> balance
const BAL_CACHE_KEY = "lw_vault_balances_cache_v1";
function readBalanceCache(): BalanceCache {
  try {
    const raw = sessionStorage.getItem(BAL_CACHE_KEY);
    if (!raw) return {};
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return j;
  } catch {}
  return {};
}
function writeBalanceCache(m: BalanceCache) {
  try {
    sessionStorage.setItem(BAL_CACHE_KEY, JSON.stringify(m));
  } catch {}
}

/* ---------- image helpers ---------- */
function looksLikeBareBase64(input: string) {
  const str = input.replace(/\s/g, "");
  if (/^(?:iVBOR|\/9j\/|UklGR)/.test(str)) return true;
  return (
    str.length > 100 && /^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0
  );
}
function pickRawImage(c: Customer): string | null {
  return (
    (c.profileImageUrl && c.profileImageUrl.trim()) ||
    (c.avatarUrl && c.avatarUrl.trim()) ||
    (c.avatar && c.avatar.trim()) ||
    null
  );
}
function toImageSrc(c: Customer): string | null {
  const raw = pickRawImage(c);
  if (!raw) return null;
  const v = raw.trim();
  if (v.startsWith("data:image/")) return v;
  if (looksLikeBareBase64(v)) {
    const head = v.startsWith("iVBOR") ? "image/png" : "image/jpeg";
    return `data:${head};base64,${v}`;
  }
  try {
    const u = new URL(v);
    return u.toString();
  } catch {
    return v.startsWith("/") ? v : `/${v}`;
  }
}

/* Avatar with fallback initials (same look as Customers page) */
function Avatar({
  customer,
  size = 40,
}: {
  customer: Customer;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initials = `${(customer.firstName || " ")[0]}${
    (customer.lastName || " ")[0]
  }`.toUpperCase();
  const src = broken ? null : toImageSrc(customer);

  if (src) {
    return (
      <div
        className="rounded-full overflow-hidden bg-gray-100"
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={`${customer.firstName} ${customer.lastName}`}
          width={size}
          height={size}
          className="w-full h-full object-cover"
          unoptimized
          onError={() => setBroken(true)}
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={`Avatar for ${customer.firstName} ${customer.lastName}`}
    >
      {initials}
    </div>
  );
}

/* map user-like row into Customer (same rules as Customers page) */
function mapUserLikeRow(row: any): Customer {
  const user = row?.user || row?.customer || row?.owner || {};
  const base = { ...user, ...row };

  const id =
    row.customerId ||
    user.id ||
    base.customerId ||
    base.userId ||
    base.id ||
    row.beneficiaryId ||
    row._id ||
    "";

  const firstName =
    s(base.firstName) ||
    s(base.firstname) ||
    s(base.first_name) ||
    s(base.givenName) ||
    s(base.given_name);

  const lastName =
    s(base.lastName) ||
    s(base.lastname) ||
    s(base.last_name) ||
    s(base.surname) ||
    s(base.family_name);

  const phone = s(base.phoneNumber) || s(base.phone) || s(base.msisdn) || "";

  const profileImageUrl =
    base.profileImageUrl || base.photoUrl || base.photo || null;
  const avatarUrl = base.avatarUrl || base.avatar || null;

  const createdAt =
    base.createdAt ||
    base.created_at ||
    row.createdAt ||
    row.created_at ||
    undefined;

  const email = base.email || base.emailAddress || base.email_address || null;
  const username = base.username || base.userName || null;

  return {
    id: String(id),
    firstName: (firstName || "").trim(),
    lastName: (lastName || "").trim(),
    phone,
    phoneNumber: phone,
    createdAt,
    vaultBalance: null,
    avatarUrl,
    profileImageUrl,
    avatar: base.avatar || null,
    email,
    username,
  };
}

/* ---------- filters ---------- */
type FilterKey = "phone" | "name" | "username";
const FILTERS: {
  key: FilterKey;
  label: string;
  Icon: any;
  placeholder: string;
}[] = [
  {
    key: "phone",
    label: "Phone No.",
    Icon: Phone,
    placeholder: "Search by phone number",
  },
  { key: "name", label: "Name", Icon: User, placeholder: "Search by name" },
  {
    key: "username",
    label: "Username",
    Icon: AtSign,
    placeholder: "Search by username",
  },
];

/* -------- page -------- */
export default function AllBeneficiariesPage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();

  // data
  const [beneficiaries, setBeneficiaries] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // search & filter
  const [filter, setFilter] = useState<FilterKey>("phone");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // picker (actions inside card)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flow, setFlow] = useState<"deposit" | "withdraw">("deposit");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const nav = (href: string) => startTransition(() => router.push(href));
  const refresh = () =>
    startTransition(() => {
      router.refresh?.();
    });

  // dropdown close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  /* ---------- Load BENEFICIARIES ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "100",
          sort: "createdAt:DESC",
        }).toString();

        const res = await fetch(`/api/v1/agent/beneficiaries?${qs}`, {
          cache: "no-store",
          credentials: "include",
        });

        const text = await res.text();
        let json: any = {};
        try {
          json = JSON.parse(text || "{}");
        } catch {}

        if (!res.ok) {
          throw new Error(json?.message || json?.error || `HTTP ${res.status}`);
        }

        const rows = extractArray(json);
        const mapped = rows.map(mapUserLikeRow);
        const deduped = uniq(mapped, (c) => c.id).sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
        );

        if (!cancelled) {
          setBeneficiaries(deduped);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setLoading(false);
          setErrorMsg(e?.message || "Failed to load beneficiaries.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- ENRICH vault balances (mirror of Customers page) ---------- */
  useEffect(() => {
    let cancelled = false;

    async function getTotalBalanceFromAPI(customerId: string): Promise<number> {
      const cache = readBalanceCache();
      if (cache[customerId] != null) return cache[customerId];

      // Primary: aggregated balance endpoint
      try {
        const r = await fetch(
          `/api/v1/agent/customers/${encodeURIComponent(
            customerId
          )}/vaults/balance`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const bal = Number(j?.balance ?? j?.data?.balance ?? 0) || 0;
          const next = { ...cache, [customerId]: bal };
          writeBalanceCache(next);
          return bal;
        }
      } catch {}

      // Fallback: sum ongoing vaults balances
      try {
        const listRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults?status=ONGOING`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );
        if (!listRes.ok) return 0;
        const listJ = await listRes.json().catch(() => ({}));
        const apiVaults: APIVault[] = extractArray(listJ);

        let total = 0;
        for (const v of apiVaults || []) {
          const apiId = v.id || v.vaultId || v._id || "";
          if (!apiId) continue;
          try {
            const vr = await fetch(
              `/api/v1/agent/customers/${customerId}/vaults/${apiId}`,
              {
                cache: "no-store",
                credentials: "include",
              }
            );
            if (!vr.ok) continue;
            const vj = await vr.json().catch(() => ({}));
            const d = vj?.data ?? vj ?? {};
            const bal =
              Number(
                d.availableBalance ??
                  d.currentAmount ??
                  d.currentBalance ??
                  d.amount ??
                  d.balance ??
                  0
              ) || 0;
            total += bal;
          } catch {}
        }

        const next = { ...cache, [customerId]: total };
        writeBalanceCache(next);
        return total;
      } catch {
        return 0;
      }
    }

    async function enrich(list: Customer[]) {
      if (!list.length) return;
      const ids = list.map((c) => c.id).filter(Boolean);
      const CONCURRENCY = 4;
      let i = 0;

      async function worker() {
        while (i < ids.length) {
          const idx = i++;
          const cid = ids[idx];
          const bal = await getTotalBalanceFromAPI(cid);
          if (cancelled) return;
          setBeneficiaries((prev) =>
            prev.map((c) => (c.id === cid ? { ...c, vaultBalance: bal } : c))
          );
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    }

    if (beneficiaries.length) enrich(beneficiaries);
    return () => {
      cancelled = true;
    };
  }, [beneficiaries.length]);

  /* ---------- Visible list (by selected filter) ---------- */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return beneficiaries;

    if (filter === "phone") {
      const qDigits = q.replace(/\D/g, "");
      return beneficiaries.filter((c) =>
        displayPhoneLocal(c.phoneNumber || c.phone || "").includes(qDigits)
      );
    }

    if (filter === "name") {
      return beneficiaries.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      );
    }

    // username
    return beneficiaries.filter((c) =>
      (c.username || "").toLowerCase().includes(q)
    );
  }, [beneficiaries, query, filter]);

  /* ---------- Card actions ---------- */
  const openPicker = (mode: "deposit" | "withdraw", customerId: string) => {
    setFlow(mode);
    setSelectedCustomerId(customerId);
    setActiveCustomer(customerId);
    setPickerOpen(true);
  };
  const goToVaultOverview = (customerId: string) => {
    setActiveCustomer(customerId);
    nav(`/customer/vault?customerId=${encodeURIComponent(customerId)}`);
  };
  const goToPersonalVault = (customerId: string) => {
    setActiveCustomer(customerId);
    nav(
      `/customer/vault/personal-vault?customerId=${encodeURIComponent(
        customerId
      )}`
    );
  };

  const navDisabled = isRouting;

  return (
    <>
      <LogoSpinner show={isRouting} />
      <div
        className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4"
        aria-busy={isRouting}
      >
        {/* global overlay while routing */}

        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="px-4 pt-6 pb-2 bg-white flex items-center justify-between">
            <button
              onClick={() => startTransition(() => router.back())}
              disabled={navDisabled}
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={refresh}
              disabled={navDisabled}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black disabled:opacity-60"
              aria-label="Refresh"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Header */}
          <div className="px-4 pb-3">
            <h1 className="text-2xl font-extrabold text-black">
              My Beneficiaries
            </h1>
            <p className="text-[12px] text-gray-500 mt-1">
              {loading ? "Loading…" : `${visible.length} customers loaded`}
            </p>
          </div>

          {/* Filter Row — dropdown (narrow & gray) + longer search */}
          <div className="px-4 pb-4">
            <div className="flex gap-2">
              {/* Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="h-11 min-w-[128px] inline-flex items-center gap-2 pl-3 pr-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900"
                >
                  {(() => {
                    const current = FILTERS.find((f) => f.key === filter)!;
                    const Ico = current.Icon;
                    return (
                      <>
                        <Ico className="w-4 h-4" />
                        {current.label}
                        <ChevronDown className="w-4 h-4 ml-1" />
                      </>
                    );
                  })()}
                </button>

                {menuOpen && (
                  <div className="absolute left-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-gray-100 z-20 p-2">
                    {FILTERS.map(({ key, label, Icon }) => {
                      const selected = key === filter;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setFilter(key);
                            setMenuOpen(false);
                            setQuery("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-3 rounded-lg ${
                            selected ? "bg-gray-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="inline-flex items-center gap-3 text-[13px] font-semibold text-gray-900">
                            <Icon className="w-4 h-4" />
                            {label}
                          </span>
                          {selected && (
                            <Check className="w-4 h-4 text-gray-900" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Longer Search input */}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
                <input
                  type={filter === "phone" ? "tel" : "text"}
                  inputMode={filter === "phone" ? "numeric" : "text"}
                  pattern={filter === "phone" ? "[0-9]*" : undefined}
                  value={query}
                  onChange={(e) =>
                    setQuery(
                      filter === "phone"
                        ? e.target.value.replace(/\D/g, "")
                        : e.target.value
                    )
                  }
                  placeholder={
                    FILTERS.find((f) => f.key === filter)?.placeholder
                  }
                  className="w-full h-11 pl-10 pr-3 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Body: list / empty / loading */}
          <div className="px-4 pb-6">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-gray-50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : errorMsg ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[12px] text-rose-700">
                {errorMsg}
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  No beneficiaries match your search
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {visible.map((c) => {
                  const rawPhone = c.phoneNumber || c.phone || "";
                  const phone = displayPhoneLocal(rawPhone);
                  const vb =
                    typeof c.vaultBalance === "number" ? c.vaultBalance : 0;

                  return (
                    <button
                      key={c.id}
                      onClick={() => goToPersonalVault(c.id)}
                      disabled={navDisabled}
                      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.995] transition disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label={`Open ${c.firstName} ${c.lastName} personal vault`}
                    >
                      {/* Top: avatar/photo + name */}
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar customer={c} size={40} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.email ? (
                            <p className="text-[11px] text-gray-500 truncate">
                              {c.email}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Middle: balance + phone */}
                      <div className="flex items-center justify-between text-xs">
                        <p className="text-gray-600">
                          Vault Balance:{" "}
                          <span
                            className="font-semibold"
                            style={{ color: C.deposit }}
                          >
                            {fmtNairaCompact(vb)}
                          </span>
                        </p>
                        <p className="text-gray-600">
                          Phone No:{" "}
                          <span className="font-semibold text-gray-900">
                            {phone}
                          </span>
                        </p>
                      </div>

                      {/* Actions row */}
                      <div className="mt-3 flex items-center gap-8 text-[13px] font-semibold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPicker("deposit", c.id);
                          }}
                          className="inline-flex items-center gap-1.5"
                          style={{ color: C.deposit }}
                          disabled={navDisabled}
                        >
                          <Image
                            src="/uploads/mdi_instant-deposit.png"
                            alt="Deposit"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                          />
                          Deposit
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goToVaultOverview(c.id);
                          }}
                          className="inline-flex items-center gap-1.5"
                          style={{ color: C.vault }}
                          disabled={navDisabled}
                        >
                          <Image
                            src="/uploads/fluent_vault-24-filled.png"
                            alt="Check vault"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                          />
                          Check vault
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPicker("withdraw", c.id);
                          }}
                          className="inline-flex items-center gap-1.5"
                          style={{ color: C.withdraw }}
                          disabled={navDisabled}
                        >
                          <Image
                            src="/uploads/ph_hand-withdraw-fill.png"
                            alt="Withdraw"
                            width={16}
                            height={16}
                            className="w-4 h-4"
                          />
                          Withdraw
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===== Simple action picker (optional small modal) ===== */}
        {pickerOpen && selectedCustomerId && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Choose Action
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const cid = selectedCustomerId!;
                    setPickerOpen(false);
                    setActiveCustomer(cid);
                    nav(
                      `/customer/vault/deposit?customerId=${encodeURIComponent(
                        cid
                      )}`
                    );
                  }}
                  className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-60"
                  disabled={navDisabled}
                >
                  Deposit
                </button>
                <button
                  onClick={() => {
                    const cid = selectedCustomerId!;
                    setPickerOpen(false);
                    setActiveCustomer(cid);
                    nav(
                      `/customer/vault/withdraw?customerId=${encodeURIComponent(
                        cid
                      )}`
                    );
                  }}
                  className="w-full h-12 rounded-xl bg-gray-200 text-gray-900 font-semibold disabled:opacity-60"
                  disabled={navDisabled}
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
