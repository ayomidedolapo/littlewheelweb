"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Eye,
  CheckSquare,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Vault = {
  id: string;
  name: string;
  balance: number;
  target: number;
  daily: number;
};
type Tx = { id: string; note: string; amount: number; at: string };

const NGN = (v: number) =>
  `₦${(v || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export default function CustomerVaultPage() {
  const router = useRouter();

  const [vaults, setVaults] = useState<Vault[]>([
    {
      id: "v1",
      name: "Junior School fee",
      balance: 120_000,
      target: 250_000,
      daily: 1_000,
    },
    {
      id: "v2",
      name: "House Rent",
      balance: 120_000,
      target: 250_000,
      daily: 1_000,
    },
    {
      id: "v3",
      name: "Keke Installment",
      balance: 120_000,
      target: 250_000,
      daily: 1_000,
    },
  ]);

  const [txs] = useState<Tx[]>([
    {
      id: "t1",
      note: "Saved",
      amount: 10_000,
      at: new Date("2025-03-04T02:46:32Z").toISOString(),
    },
    {
      id: "t2",
      note: "Saved",
      amount: 5_000,
      at: new Date("2025-03-03T09:12:32Z").toISOString(),
    },
    {
      id: "t3",
      note: "Saved",
      amount: 12_500,
      at: new Date("2025-03-02T14:20:10Z").toISOString(),
    },
  ]);

  const total = useMemo(
    () => vaults.reduce((s, v) => s + v.balance, 0),
    [vaults]
  );
  const withdrawable = useMemo(() => Math.max(total - 1_000, 0), [total]);

  // Deposit/Withdraw sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [vaultId, setVaultId] = useState(vaults[0]?.id ?? "");

  // Tx “See all” sheet
  const [txSheetOpen, setTxSheetOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    open: boolean;
    title: string;
    desc?: string;
  }>({
    open: false,
    title: "",
  });

  const openAction = (m: "deposit" | "withdraw") => {
    setMode(m);
    setVaultId(vaults[0]?.id ?? "");
    setAmount("");
    setSheetOpen(true);
  };

  const doAction = () => {
    const v = vaults.find((x) => x.id === vaultId);
    const amt = Number(amount);
    if (!v || !amt || amt <= 0) return;

    setVaults((prev) =>
      prev.map((p) =>
        p.id === v.id
          ? {
              ...p,
              balance:
                mode === "deposit"
                  ? p.balance + amt
                  : Math.max(p.balance - amt, 0),
            }
          : p
      )
    );

    setSheetOpen(false);
    setToast({
      open: true,
      title:
        mode === "deposit" ? `Deposited ${NGN(amt)}` : `Withdrawn ${NGN(amt)}`,
      desc: v.name,
    });
    setTimeout(() => setToast((t) => ({ ...t, open: false })), 2200);
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <div className="w-full max-w-sm bg-white min-h-screen md:min-h-0 md:rounded-3xl md:shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* ===== HERO (matched to screenshot) ===== */}
        <div className="px-4 relative">
          <div
            className="relative rounded-2xl bg-black text-white p-5 overflow-hidden pb-8"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 1px, transparent 64px), repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0, rgba(255,255,255,.08) 1px, transparent 1px, transparent 64px)",
            }}
          >
            {/* Add new → route to /customer/vault/create */}
            <button
              onClick={() => router.push("/customer/vault/create")}
              className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-white"
            >
              Add new <Plus className="h-4 w-4" />
            </button>

            {/* Total Balance */}
            <div className="flex items-center gap-1 text-[12px] text-white/85 mb-1">
              <span>Total Balance</span>
              <Eye className="h-3.5 w-3.5 opacity-80" />
            </div>
            <div className="text-[28px] leading-none font-extrabold tracking-tight mb-6">
              ₦30,000.00
            </div>

            {/* Withdrawable pill */}
            <div className="mb-6">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-[#2A3F5D]/90 px-3 py-1 text-[12px] shadow-sm">
                <span className="opacity-95">Withdrawable Amount:&nbsp;</span>
                <span className="font-semibold">₦29,000.00</span>
              </div>
            </div>
          </div>

          {/* Segmented actions - positioned to overlap the bottom of the black card */}
          <div className="absolute bottom-[-1px] left-1/2 transform -translate-x-1/2  w-[86%] z-10">
            <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-xl border h-[56px] border-gray-200 bg-white text-gray-900 shadow-lg">
              <button
                onClick={() => openAction("deposit")}
                className="flex items-center justify-center gap-2 py-3 text-[13px] font-semibold hover:bg-black/5"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-white text-xs font-bold">
                  +
                </span>
                Deposit
              </button>
              <button
                onClick={() => openAction("withdraw")}
                className="flex items-center justify-center gap-2 border-l border-gray-200 py-3 text-[13px] font-semibold hover:bg-black/5"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-black text-white">
                  <CheckSquare className="h-3.5 w-3.5" />
                </span>
                Withdraw
              </button>
            </div>
          </div>

          {/* spacer to account for the overlapping buttons */}
          <div className="h-6" />
        </div>

        {/* Personal Vaults */}
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Personal Vaults
            </h2>
            <button className="text-[12px] text-gray-600 inline-flex items-center gap-1">
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {vaults.map((v) => {
              const pct = Math.min(
                100,
                Math.round((v.balance / v.target) * 100)
              );
              return (
                <button
                  key={v.id}
                  onClick={() =>
                    router.push(`/customer/vault/${slugify(v.name)}`)
                  }
                  aria-label={`Open ${v.name}`}
                  className="w-full text-left flex items-stretch gap-3 rounded-xl border border-gray-200 p-3 bg-white hover:bg-gray-50 transition"
                >
                  {/* Left art */}
                  <div className="shrink-0 flex items-center justify-center h-16 w-16">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/uploads/Little wheel personal vault bw 1.png"
                      alt="Vault"
                      className="h-12 w-12 object-contain"
                    />
                  </div>

                  {/* Right details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                        {v.name}
                      </p>
                      <p className="text-[12px] leading-tight">
                        <span className="font-bold text-red-600">
                          {NGN(v.balance)}
                        </span>
                        <span className="text-gray-400 font-normal">
                          /{NGN(v.target)}
                        </span>
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Savings: {NGN(v.daily)} daily
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-600">{pct}%</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="px-4 mt-5 pb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <button
              onClick={() => setTxSheetOpen(true)}
              className="text-[12px] text-gray-600 inline-flex items-center gap-1"
            >
              See all <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            {txs.slice(0, 1).map((t, i) => (
              <div
                key={t.id}
                className={`flex items-center justify-between px-3 py-3 ${
                  i !== txs.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">
                      {t.note}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {new Date(t.at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-[13px] font-semibold text-emerald-600">
                  +{NGN(t.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deposit/Withdraw sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-5 shadow-2xl">
            <div className="mx-auto h-1 w-12 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-gray-500">
                  {mode === "deposit" ? "Deposit" : "Withdraw"} into vault
                </p>
                <h3 className="text-base font-semibold text-gray-900">
                  Choose vault & amount
                </h3>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <label className="block text-xs text-gray-600 mb-1">Vault</label>
            <select
              value={vaultId}
              onChange={(e) => setVaultId(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black bg-white"
            >
              {vaults.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {NGN(v.balance)}
                </option>
              ))}
            </select>

            <label className="block text-xs text-gray-600 mt-3 mb-1">
              Amount (NGN)
            </label>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:ring-2 focus:ring-black"
            />

            <button
              onClick={doAction}
              className="mt-4 w-full h-12 rounded-xl bg-black text-white font-semibold active:scale-[0.99] transition"
            >
              {mode === "deposit" ? "Deposit" : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* Transactions “See all” sheet (bottom) */}
      {txSheetOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setTxSheetOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl p-5 shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="mx-auto h-1 w-12 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">
                All Transactions
              </h3>
              <button
                onClick={() => setTxSheetOpen(false)}
                className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              {txs.map((t, i) => (
                <div
                  key={t.id}
                  className={`flex items-center justify-between px-3 py-3 bg-white ${
                    i !== txs.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">
                        {t.note}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {new Date(t.at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold text-emerald-600">
                    +{NGN(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${
          toast.open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-4 w-[92%] max-w-sm rounded-2xl bg-white shadow-xl border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600" />
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
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
