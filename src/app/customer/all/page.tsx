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

type VaultRow = {
  id: string;
  name: string;
  balance: number;
  target: number;
  daily: number;
};

const C = {
  deposit: "#0F973D",
  vault: "#1671D9",
  withdraw: "#D42620",
};

function fmtNaira2(n: number) {
  return `₦${n.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
function displayPhoneLocal(input?: string) {
  const digits = (input || "").replace(/\D/g, "");
  let v = digits;
  if (v.startsWith("234")) v = v.slice(3);
  if (v.startsWith("0")) v = v.slice(1);
  return v || "—";
}

/* ---------- caching for vault balances ---------- */
type BalanceCache = Record<string, number>;
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

/* Avatar */
function Avatar({ customer, size = 40 }: { customer: Customer; size?: number }) {
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
    >
      {initials}
    </div>
  );
}

/* map row */
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
type FilterKey = "name" | "phone" | "username";
const FILTERS = [
  {
    key: "name" as const,
    label: "Name",
    Icon: User,
    placeholder: "Search by name",
  },
  {
    key: "phone" as const,
    label: "Phone No.",
    Icon: Phone,
    placeholder: "Search by phone number",
  },
  {
    key: "username" as const,
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
  const [filter, setFilter] = useState<FilterKey>("name");
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // remote search
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | undefined>(undefined);

  // picker / flow
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flow, setFlow] = useState<"deposit" | "withdraw">("deposit");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // vaults for picker (same logic as Customer page)
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [vaultsErr, setVaultsErr] = useState<string | null>(null);
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);

  const nav = (href: string) =>
    startTransition(() => {
      router.push(href);
    });
  const refresh = () =>
    startTransition(() => {
      router.refresh?.();
    });

  const navDisabled = isRouting;

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

  /* ---------- Vault Balances Enrichment ---------- */
  useEffect(() => {
    let cancelled = false;

    async function getTotalBalanceFromAPI(customerId: string): Promise<number> {
      const cache = readBalanceCache();
      if (cache[customerId] != null) return cache[customerId];

      // aggregated endpoint
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

      // fallback: sum per vault
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
          setSearchResults((prev) =>
            prev.map((c) => (c.id === cid ? { ...c, vaultBalance: bal } : c))
          );
        }
      }

      await Promise.all(Array.from({ length: 4 }, worker));
    }

    if (beneficiaries.length) enrich(beneficiaries);
    return () => {
      cancelled = true;
    };
  }, [beneficiaries.length]);

  /* ---------- Remote SEARCH ---------- */
  useEffect(() => {
    const q = query.trim();

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const qs = new URLSearchParams({
          page: "1",
          limit: "100",
          sort: "createdAt:DESC",
          query: q,
        }).toString();

        const res = await fetch(`/api/v1/agent/customers?${qs}`, {
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

        const cache = readBalanceCache();
        const withCached = mapped.map((c) =>
          cache[c.id] != null ? { ...c, vaultBalance: cache[c.id] } : c
        );

        const combined = uniq(withCached, (c) => c.id);
        setSearchResults(combined);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350) as unknown as number;
  }, [query]);

  /* ---------- Visible list ---------- */
  const visible = useMemo(() => {
    const base = query.trim() ? searchResults : beneficiaries;
    const q = query.trim().toLowerCase();
    if (!q) return base;

    if (filter === "phone") {
      const qDigits = q.replace(/\D/g, "");
      return base.filter((c) =>
        displayPhoneLocal(c.phoneNumber || c.phone || "").includes(qDigits)
      );
    }

    if (filter === "name") {
      return base.filter((c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
      );
    }

    // username
    return base.filter((c) =>
      (c.username || "").toLowerCase().includes(q)
    );
  }, [beneficiaries, searchResults, query, filter]);

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

  /* ---------- Load vaults for picker (same as Customers page) ---------- */
  useEffect(() => {
    let cancelled = false;

    async function loadVaults(cid: string) {
      try {
        setVaultsLoading(true);
        setVaultsErr(null);
        setVaults([]);
        setSelectedVaultId(null);

        const listRes = await fetch(
          `/api/v1/agent/customers/${cid}/vaults?status=ONGOING`,
          { cache: "no-store", credentials: "include" }
        );
        if (!listRes.ok)
          throw new Error(`Vaults HTTP ${listRes.status} for ${cid}`);
        const listJ = await listRes.json();
        const apiVaults: APIVault[] = extractArray(listJ);

        const enriched = await Promise.all(
          (apiVaults || []).map(async (v): Promise<VaultRow> => {
            const apiId = v.id || v.vaultId || v._id || "";
            let detail: any = {};
            if (apiId) {
              try {
                const vr = await fetch(
                  `/api/v1/agent/customers/${cid}/vaults/${apiId}`,
                  { cache: "no-store", credentials: "include" }
                );
                if (vr.ok) {
                  const vj = await vr.json();
                  detail = vj?.data ?? vj ?? {};
                }
              } catch {}
            }

            const currentBalance =
              Number(
                detail?.availableBalance ??
                  detail?.currentAmount ??
                  detail?.currentBalance ??
                  0
              ) || 0;

            return {
              id: apiId || String(v.id || v.vaultId || v._id || ""),
              name: v.name || detail?.name || "Personal Vault",
              balance: currentBalance,
              target:
                Number(v.targetAmount ?? detail?.targetAmount ?? 0) || 0,
              daily: Number(v.amount ?? detail?.amount ?? 0) || 0,
            };
          })
        );

        if (!cancelled) setVaults(enriched);
      } catch (e: any) {
        if (!cancelled)
          setVaultsErr(e?.message || "Failed to load customer vaults.");
      } finally {
        if (!cancelled) setVaultsLoading(false);
      }
    }

    if (pickerOpen && selectedCustomerId) loadVaults(selectedCustomerId);
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, selectedCustomerId]);

  const proceed = () => {
    if (!selectedVaultId || !selectedCustomerId) return;
    setPickerOpen(false);
    const q = new URLSearchParams();
    q.set("customerId", selectedCustomerId);
    q.set("vaultId", selectedVaultId);
    nav(
      flow === "deposit"
        ? `/customer/vault/deposit?${q.toString()}`
        : `/customer/vault/withdraw?${q.toString()}`
    );
  };

  return (
    <>
      <LogoSpinner show={isRouting} />

      <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
          {/* Top Bar */}
          <div className="px-4 pt-6 pb-2 bg-white flex items-center justify-between">
            <button
              onClick={() => startTransition(() => router.back())}
              disabled={navDisabled}
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-gray-900 hover:bg-gray-200 px-3 py-1.5 rounded-md disabled:opacity-60"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={refresh}
              disabled={navDisabled}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black disabled:opacity-60"
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
              {loading
                ? "Loading…"
                : `${visible.length} customer${
                    visible.length === 1 ? "" : "s"
                  } loaded`}
            </p>
          </div>

          {/* Filter Row */}
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

              {/* Search Input */}
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
                  className="w-full h-11 pl-10 pr-9 bg-white border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />

                {/* search loading icon in input */}
                {searching && (
                  <Image
                    src="/uploads/wired-outline-12-layers-in-reveal (1).webp"
                    alt="Searching"
                    width={22}
                    height={22}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* BODY SECTION */}
          <div className="px-4 pb-6">
            {/* 1) PAGE IS LOADING */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-xl bg-gray-100 border border-gray-100 shadow-xs animate-pulse"
                  />
                ))}
              </div>
            ) : errorMsg ? (
              /* ERROR */
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-[12px] text-rose-700">
                {errorMsg}
              </div>
            ) : searching ? (
              /* 2) SEARCHING → big loader in body */
              <div className="flex flex-col items-center justify-center py-14">
                <Image
                  src="/uploads/wired-outline-12-layers-in-reveal (1).webp"
                  alt="Searching..."
                  width={100}
                  height={100}
                  className="w-24 h-24"
                />
                <p className="text-sm text-gray-600 mt-3">Searching…</p>
              </div>
            ) : query.trim() && visible.length === 0 ? (
              /* 3) NO MATCH after search → stop animation + text */
              <div className="flex flex-col items-center justify-center py-14">
                <Image
                  src="/uploads/wired-outline-12-layers-in-reveal (1).webp"
                  alt="No match"
                  width={100}
                  height={100}
                  className="w-24 h-24"
                />
                <p className="text-gray-500 text-sm font-medium mt-3">
                  No customers match your search
                </p>
              </div>
            ) : visible.length === 0 ? (
              /* 4) NO BENEFICIARIES YET */
              <div className="text-center py-14">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SearchIcon className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  No beneficiaries found yet
                </p>
              </div>
            ) : (
              /* 5) NORMAL LIST */
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
                      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 shadow-sm active:scale-[0.995] transition disabled:opacity-60"
                    >
                      {/* Top */}
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

                      {/* Middle */}
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

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-8 text-[13px] font-semibold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openPicker("deposit", c.id);
                          }}
                          className="inline-flex items-center gap-1.5"
                          style={{ color: C.deposit }}
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

        {/* ===== Vault Picker Modal (Deposit / Withdraw) ===== */}
        {pickerOpen && selectedCustomerId && (
          <div className="fixed inset-0 z-50">
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPickerOpen(false)}
            />
            {/* sheet */}
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-3xl p-5 shadow-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-3" />

              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Choose Preferred Vault
              </h3>

              {vaultsErr && (
                <p className="text-[12px] text-rose-600 mb-3">{vaultsErr}</p>
              )}

{vaultsLoading ? (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="h-20 rounded-xl bg-gray-100 border border-gray-100 shadow-xs animate-pulse" 
      />
    ))}
  </div>
) : vaults.length === 0 ? (
                <p className="text-sm text-gray-500">No vaults yet.</p>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-auto pr-1">
                  {vaults.map((v) => {
                    const pct = v.target
                      ? Math.min(100, Math.round((v.balance / v.target) * 100))
                      : 0;
                    const isActive = selectedVaultId === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVaultId(v.id)}
                        className={`w-full text-left rounded-xl border p-3 bg-white flex items-center gap-3 ${
                          isActive ? "border-black" : "border-gray-200"
                        }`}
                      >
                        <div className="shrink-0">
                          <Image
                            src="/uploads/Little wheel personal vault bw 1.png"
                            alt="Vault"
                            width={56}
                            height={56}
                            className="w-14 h-14 object-contain"
                            priority
                          />
                        </div>

                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                            {v.name}
                          </p>
                          <p className="text-[11px] text-gray-600">
                            Amount: <strong>{fmtNaira2(v.daily)}</strong>{" "}
                            (DAILY)
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: "#10B981",
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-600">
                              {isFinite(pct) ? pct : 0}%
                            </span>
                          </div>
                        </div>

                        <div className="text-right text-[12px] font-semibold">
                          <span className="text-red-600">
                            {fmtNaira2(v.balance)}
                          </span>
                          <span className="text-gray-400">/</span>
                          <span className="text-green-600">
                            {fmtNaira2(v.target)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={proceed}
                disabled={
                  !selectedVaultId || !selectedCustomerId || navDisabled
                }
                className={`mt-4 w-full h-12 rounded-2xl font-semibold ${
                  selectedVaultId && selectedCustomerId && !navDisabled
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Select and Proceed
              </button>

              <button
                onClick={() => {
                  setPickerOpen(false);
                  if (selectedCustomerId) {
                    setActiveCustomer(selectedCustomerId);
                    nav(
                      `/customer/vault/create?customerId=${encodeURIComponent(
                        selectedCustomerId
                      )}`
                    );
                  } else {
                    nav("/customer/vault/create");
                  }
                }}
                disabled={navDisabled}
                className="mt-3 w-full text-center text-[13px] font-semibold text-black underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Create New Vault
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
