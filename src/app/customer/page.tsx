/* pages/customers/page.tsx */
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  RotateCcw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import BottomTabs from "../dash/components/BottomTabs";

/* ✅ Logo spinner pattern (exact as BottomTabs) */
import LogoSpinner from "../../components/loaders/LogoSpinner";

/* -------- types & utils -------- */
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

/* Avatar with fallback initials */
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

/* map user-like row into Customer */
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

  const vaultBalanceNum = Number(
    base.vaultBalance ??
      base.balance ??
      base.walletBalance ??
      base.currentBalance ??
      0
  );
  const vaultBalance =
    Number.isFinite(vaultBalanceNum) && vaultBalanceNum !== 0
      ? vaultBalanceNum
      : null;

  const email = base.email || base.emailAddress || base.email_address || null;

  return {
    id: String(id),
    firstName: (firstName || "").trim(),
    lastName: (lastName || "").trim(),
    phone,
    phoneNumber: phone,
    createdAt,
    vaultBalance,
    avatarUrl,
    profileImageUrl,
    avatar: base.avatar || null,
    email,
  };
}

/* ---------------- Skeleton helpers ---------------- */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-md bg-gray-200/80",
        "dark:bg-gray-700/40",
        className,
      ].join(" ")}
    />
  );
}

function CustomerCardSkeleton() {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-2 w-28" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-36" />
        <Skeleton className="h-2.5 w-28" />
      </div>

      <div className="mt-4 flex items-center gap-6">
        <div className="inline-flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="inline-flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="inline-flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

function FullPageSkeleton() {
  return (
    <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
      <div className="bg-white px-4 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>

        <div className="relative">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>

      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>

      <div className="px-4 py-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CustomerCardSkeleton key={i} />
        ))}
      </div>

      {/* ✅ spacer so content never sits under BottomTabs */}
      <div className="h-28" />
    </div>
  );
}

/* -------- page -------- */
export default function CustomerPage() {
  const router = useRouter();
  const [isRouting, startTransition] = useTransition();

  // beneficiaries (default list)
  const [beneficiaries, setBeneficiaries] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // vault-balance enrichment state
  const [enriching, setEnriching] = useState(false);

  // SEARCH — number only
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const debounceRef = useRef<number | undefined>(undefined);

  // picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [flow, setFlow] = useState<"deposit" | "withdraw">("deposit");
  const [selectedVaultId, setSelectedVaultId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  // vaults for picker
  const [vaults, setVaults] = useState<VaultRow[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(false);
  const [vaultsErr, setVaultsErr] = useState<string | null>(null);

  /* ✅ Use startTransition so the LogoSpinner shows while navigating */
  const routePush = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };
  const routeRefresh = () => {
    startTransition(() => {
      router.refresh?.();
      setTimeout(() => location.reload(), 40);
    });
  };

  const openPicker = (mode: "deposit" | "withdraw", customerId: string) => {
    setFlow(mode);
    setSelectedVaultId(null);
    setSelectedCustomerId(customerId);
    setActiveCustomer(customerId);
    setPickerOpen(true);
  };

  const proceed = () => {
    if (!selectedVaultId || !selectedCustomerId) return;
    setPickerOpen(false);
    const q = new URLSearchParams();
    q.set("customerId", selectedCustomerId);
    q.set("vaultId", selectedVaultId);
    routePush(
      flow === "deposit"
        ? `/customer/vault/deposit?${q.toString()}`
        : `/customer/vault/withdraw?${q.toString()}`
    );
  };

  /* ---------- 1) Load BENEFICIARIES ---------- */
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
          setErrorMsg(e?.message || "Failed to load users.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- 1b) ENRICH vault balances ---------- */
  useEffect(() => {
    let cancelled = false;

    async function getTotalBalanceFromAPI(customerId: string): Promise<number> {
      const cache = readBalanceCache();
      if (cache[customerId] != null) return cache[customerId];

      try {
        const r = await fetch(
          `/api/v1/agent/customers/${encodeURIComponent(
            customerId
          )}/vaults/balance`,
          { cache: "no-store", credentials: "include" }
        );
        if (r.ok) {
          const j = await r.json().catch(() => ({}));
          const bal = Number(j?.balance ?? 0) || 0;
          const next = { ...cache, [customerId]: bal };
          writeBalanceCache(next);
          return bal;
        }
      } catch {}

      try {
        const listRes = await fetch(
          `/api/v1/agent/customers/${customerId}/vaults?status=ONGOING`,
          { cache: "no-store", credentials: "include" }
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
              { cache: "no-store", credentials: "include" }
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
      setEnriching(true);

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

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      if (!cancelled) setEnriching(false);
    }

    if (beneficiaries.length) enrich(beneficiaries);
    return () => {
      cancelled = true;
    };
  }, [beneficiaries.length]);

  /* ---------- 2) Number-only search (require 6+ digits) ---------- */
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const qDigits = search.replace(/\D/g, "").trim();

    if (!qDigits || qDigits.length < 6) {
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
          query: qDigits,
          sort: "createdAt:DESC",
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
  }, [search]);

  /* ---------- Load vaults for picker ---------- */
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
              target: Number(v.targetAmount ?? detail?.targetAmount ?? 0) || 0,
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

  /* ---------- Which list to show (filter ONLY by phone) ---------- */
  const visible = useMemo(() => {
    const qDigits = search.replace(/\D/g, "").trim();
    if (qDigits && qDigits.length < 6) return [];

    if (qDigits) {
      return (searchResults || []).filter((c) => {
        const phone = (c.phoneNumber || c.phone || "").replace(/\D/g, "");
        const normalized = displayPhoneLocal(phone);
        return normalized.includes(qDigits);
      });
    }
    return beneficiaries;
  }, [search, searchResults, beneficiaries]);

  const navDisabled = isRouting;
  const refresh = () => routeRefresh();

  const goToVaultOverview = (customerId: string) => {
    setActiveCustomer(customerId);
    routePush(`/customer/vault?customerId=${encodeURIComponent(customerId)}`);
  };
  const goToPersonalVault = (customerId: string) => {
    setActiveCustomer(customerId);
    routePush(
      `/customer/vault/personal-vault?customerId=${encodeURIComponent(
        customerId
      )}`
    );
  };

  // For showing the result count only when 6+ digits entered
  const searchDigits = search.replace(/\D/g, "").trim();
  const canShowCount = searchDigits.length >= 6;

  /* === Draggable Floating Onboard Button state === */
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [floatReady, setFloatReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const floatRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    isDown: false,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const ignoreClickRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rect = floatRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 200;
      const height = rect?.height ?? 60;

      setFloatPos({
        x: Math.max(0, vw - width - 20),
        y: Math.max(0, vh - height - 120),
      });

      setFloatReady(true);
    }, 50);
  }, []);

  const handlePointerDown = (e: any) => {
    e.preventDefault();
    const rect = floatRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragRef.current = {
      isDown: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top,
    };

    setIsDragging(false);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current.isDown) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      const threshold = 4;
      if (!dragRef.current.dragging) {
        if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
        dragRef.current.dragging = true;
        setIsDragging(true);
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      const rect = floatRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 0;
      const height = rect?.height ?? 0;

      const rawX = dragRef.current.originX + dx;
      const rawY = dragRef.current.originY + dy;

      const minX = 0;
      const minY = 0;
      const maxX = vw - width;
      const maxY = vh - height;

      setFloatPos({
        x: Math.min(Math.max(rawX, minX), maxX),
        y: Math.min(Math.max(rawY, minY), maxY),
      });
    };

    const up = () => {
      if (!dragRef.current.isDown) return;

      if (dragRef.current.dragging) {
        ignoreClickRef.current = true;
      }

      dragRef.current.isDown = false;
      dragRef.current.dragging = false;
      setIsDragging(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <>
      <LogoSpinner show={isRouting} />

      <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
        {/* ✅ Single card wrapper so BottomTabs is ALWAYS present and never covered */}
        <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden relative">
          {/* ✅ content area has padding-bottom so it never sits under the tabs */}
          <div className="pb-24">
            {loading && !search ? (
              <FullPageSkeleton />
            ) : (
              <>
                {/* Header */}
                <div className="bg-white px-4 pt-8 pb-6 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-black">Customers</h1>
                    <button
                      onClick={refresh}
                      disabled={navDisabled}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-black disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Refresh"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Refresh
                    </button>
                  </div>

                  {/* Search (number only) */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={search}
                      onChange={(e) => setSearch(e.target.value.replace(/\D/g, ""))}
                      placeholder="Search by phone number"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                    {canShowCount && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
                        {searching ? (
                          <span className="inline-flex items-center gap-1.5">
                            <LogoSpinner show={false} />
                            Searching…
                          </span>
                        ) : (
                          `${visible.length} result(s)`
                        )}
                      </span>
                    )}
                  </div>

                  {errorMsg && !search && (
                    <div
                      className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700"
                      role="alert"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      <p>{errorMsg}</p>
                    </div>
                  )}
                </div>

                {/* “My Beneficiaries” header row */}
                <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-black">
                      My Beneficiaries
                    </span>
                    {enriching && (
                      <span className="text-xs text-gray-500">
                        (updating balances…)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => routePush("/customer/all")}
                    disabled={navDisabled}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-4 py-4">
                  {searching && canShowCount ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <CustomerCardSkeleton key={i} />
                      ))}
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium">
                        {searchDigits.length > 0 && searchDigits.length < 6
                          ? "Enter at least the first 6 digits"
                          : search
                          ? "No users match your phone number"
                          : "No beneficiaries yet."}
                      </p>
                      {!search && (
                        <p className="text-gray-400 text-xs mt-1">
                          Onboard a customer to see them here.
                        </p>
                      )}
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
              </>
            )}
          </div>

          {/* ✅ BottomTabs pinned on mobile, static on desktop; never covered by skeleton */}
          <div className="fixed bottom-0 left-0 right-0 md:static bg-white">
            <div className="mx-auto w-full max-w-sm">
              <BottomTabs value="customers" onChange={() => {}} className="mt-6" />
            </div>
          </div>

          {/* ✅ Bottom padding spacer */}
          <div className="h-15" />
        </div>

        {/* 🟡 Draggable Floating Onboard Button — only render when ready */}
        {floatReady && (
          <div
            ref={floatRef}
            className="fixed z-50"
            style={{
              left: floatPos.x,
              top: floatPos.y,
              touchAction: "none",
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onPointerDown={handlePointerDown}
          >
            <button
              type="button"
              onClick={() => {
                if (ignoreClickRef.current) {
                  ignoreClickRef.current = false;
                  return;
                }
                routePush("/onboard-form");
              }}
              aria-label="Onboard new user"
              disabled={navDisabled}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
               text-white text-[12px] font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Onboard new user
            </button>
          </div>
        )}

        {/* ===== Vault Picker Modal (Deposit / Withdraw) ===== */}
        {pickerOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPickerOpen(false)}
            />
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
): vaults.length === 0 ? (
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
                            Amount: <strong>{fmtNaira2(v.daily)}</strong> (DAILY)
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
                          <span className="text-red-600">{fmtNaira2(v.balance)}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-green-600">{fmtNaira2(v.target)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={proceed}
                disabled={!selectedVaultId || !selectedCustomerId || navDisabled}
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
                    routePush(
                      `/customer/vault/create?customerId=${encodeURIComponent(
                        selectedCustomerId
                      )}`
                    );
                  } else {
                    routePush("/customer/vault/create");
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
