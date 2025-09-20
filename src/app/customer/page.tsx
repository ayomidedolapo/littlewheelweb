"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  DollarSign,
  Eye,
  ArrowUpRight,
  X,
  Check,
} from "lucide-react";
import BottomTabs from "../dash/components/BottomTabs";

/* ─────────────────────────────
   Lightweight types (same shape as mocks)
────────────────────────────── */
type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: string;
};
type Vault = {
  id: string;
  customerId: string;
  name: string;
  balance: number;
  targetAmount?: number;
  createdAt: string;
};

/* Currency helper */
const N = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default function CustomerPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");

  /* Bottom-sheet modal for deposit/withdraw */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"deposit" | "withdraw">("deposit");
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [amount, setAmount] = useState<string>("");

  /* Bottom toast (slide-up) notification */
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    desc?: string;
  }>({ open: false, title: "" });

  // Load customers from mock API; fall back to localStorage seed if needed
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/mock/customers", { cache: "no-store" });
        if (!res.ok) throw new Error("no mock api");
        const json = await res.json();
        if (!cancelled) setCustomers(json?.data ?? []);
      } catch {
        // fallback: try seed from localStorage (if you used the mockDb)
        try {
          const raw = localStorage.getItem("lw_mock_db_v1");
          const parsed = raw ? JSON.parse(raw) : null;
          const list: Customer[] = parsed?.customers ?? [];
          if (!cancelled) setCustomers(list);
        } catch {
          if (!cancelled) setCustomers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Derived filtered list */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      return name.includes(q) || c.phone.includes(q);
    });
  }, [search, customers]);

  /* Open bottom sheet for a quick deposit/withdraw */
  const openQuickAction = (mode: "deposit" | "withdraw", c: Customer) => {
    setActiveCustomer(c);
    setSheetMode(mode);
    setAmount("");
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

  /* Ensure customer has a vault; create "Main Vault" if not */
  async function ensureDefaultVault(customerId: string): Promise<Vault> {
    // 1) try list
    try {
      const r = await fetch(`/api/mock/customers/${customerId}/vaults`, {
        cache: "no-store",
      });
      if (r.ok) {
        const j = await r.json();
        const first: Vault | undefined = j?.data?.[0];
        if (first) return first;
      }
    } catch {}

    // 2) create Main Vault
    const c2 = await fetch(`/api/mock/customers/${customerId}/vaults`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Main Vault" }),
    }).catch(() => null);
    const j2 = await c2?.json().catch(() => null);
    if (!c2 || !c2.ok || !j2?.data) {
      // fallback to localStorage mock if API route not present
      const raw = localStorage.getItem("lw_mock_db_v1");
      if (raw) {
        try {
          const db = JSON.parse(raw);
          const exist: Vault | undefined = db.vaults?.find(
            (v: Vault) => v.customerId === customerId
          );
          if (exist) return exist;
        } catch {}
      }
      throw new Error("Could not create/find a vault");
    }
    return j2.data as Vault;
  }

  /* Submit quick action */
  const submitQuick = async () => {
    if (!activeCustomer) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    try {
      const v = await ensureDefaultVault(activeCustomer.id);

      const endpoint = sheetMode === "deposit" ? "deposit" : "withdraw";
      const r = await fetch(`/api/mock/vaults/${v.id}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt }),
      }).catch(() => null);

      if (!r || !r.ok) {
        // Local fallback: update localStorage
        try {
          const raw = localStorage.getItem("lw_mock_db_v1");
          if (raw) {
            const db = JSON.parse(raw);
            const target = db.vaults.find((vv: Vault) => vv.id === v.id);
            if (sheetMode === "deposit") target.balance += amt;
            else {
              if (target.balance < amt) throw new Error("Insufficient balance");
              target.balance -= amt;
            }
            localStorage.setItem("lw_mock_db_v1", JSON.stringify(db));
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Close sheet
      setAmount("");
      setSheetOpen(false);

      // Show bottom toast
      const verb = sheetMode === "deposit" ? "deposited" : "withdrawn";
      setToast({
        open: true,
        title: `Successfully ${verb}`,
        desc: `${N(amt)} ${verb} for ${activeCustomer.firstName} ${
          activeCustomer.lastName
        }.`,
      });
      // auto-hide
      setTimeout(() => setToast((t) => ({ ...t, open: false })), 2300);
    } catch (e: any) {
      alert(e?.message || "Something went wrong");
    }
  };

  /* Route to vault details */
  const goCheckVault = () => router.push("./customer/vault");

  /* Onboard flow */
  const onboard = () => router.push("./onboard");

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-white px-6 pt-8 pb-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-black mb-4">Customers</h1>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone number or name"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter row */}
        <div className="px-6 py-4 border-b border-gray-100">
          <span className="text-sm font-bold text-black">All Users</span>
        </div>

        {/* List / Empty / Loading */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm font-medium">
                No customers onboarded yet
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Start onboarding customers to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => {
                const initials =
                  (c.firstName?.[0] || "") + (c.lastName?.[0] || "");
                return (
                  <div key={c.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {initials.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {c.firstName} {c.lastName}
                          </h3>
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium mt-1">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick facts (balance is vault-specific; we can show “—” here) */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Vault Balance
                        </p>
                        <p className="font-bold text-gray-900 text-sm">—</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">
                          Phone No
                        </p>
                        <p className="font-bold text-gray-900 text-sm">
                          {c.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-semibold flex-1 justify-center"
                        onClick={() => openQuickAction("deposit", c)}
                      >
                        <DollarSign className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Deposit
                      </button>
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex-1 justify-center"
                        onClick={goCheckVault}
                      >
                        <Eye className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Check vault
                      </button>
                      <button
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex-1 justify-center"
                        onClick={() => openQuickAction("withdraw", c)}
                      >
                        <ArrowUpRight
                          className="w-3.5 h-3.5"
                          strokeWidth={2.5}
                        />
                        Withdraw
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <BottomTabs
          value="customers"
          onChange={(t) => console.log("tab:", t)}
          className="mt-8"
        />
      </div>

      {/* Floating Onboard Button */}
      <div
        className="fixed right-4 z-50 pointer-events-none"
        style={{ top: `calc(env(safe-area-inset-top) + 500px)` }}
      >
        <button
          type="button"
          onClick={onboard}
          aria-label="Onboard new user"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-black px-5 py-3
               text-white text-[12px] font-semibold shadow-xl shadow-black/40 active:scale-[0.98] transition"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Onboard new user
        </button>
      </div>

      {/* Bottom Sheet for quick deposit/withdraw */}
      {sheetOpen && activeCustomer && (
        <div className="fixed inset-0 z-50">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeSheet}
            aria-hidden
          />
          {/* sheet */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-5 shadow-2xl">
            <div className="mx-auto h-1 w-12 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500">
                  {sheetMode === "deposit" ? "Quick Deposit" : "Quick Withdraw"}
                </p>
                <h3 className="text-base font-semibold text-gray-900">
                  {activeCustomer.firstName} {activeCustomer.lastName}
                </h3>
              </div>
              <button
                onClick={closeSheet}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-xs text-gray-600 mb-1">
                Amount (NGN)
              </label>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^\d]/g, ""))
                }
                className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <button
              onClick={submitQuick}
              className="mt-4 w-full h-12 rounded-xl bg-black text-white font-semibold active:scale-[0.99] transition"
            >
              {sheetMode === "deposit" ? "Deposit" : "Withdraw"}
            </button>

            <p className="mt-3 text-[11px] text-gray-500">
              A “Main Vault” will be created automatically if none exists yet.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Toast Notification */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${
          toast.open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 w-[92%] max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {toast.title}
              </p>
              {toast.desc && (
                <p className="text-xs text-gray-600 mt-0.5">{toast.desc}</p>
              )}
            </div>
            <button
              onClick={() => setToast((t) => ({ ...t, open: false }))}
              className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
