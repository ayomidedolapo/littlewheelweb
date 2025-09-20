"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronDown,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/** --- Minimal bank list (trim or extend freely). I included popular banks + fintechs. --- */
type Bank = { name: string; code: string; logo?: string };
const BANKS: Bank[] = [
  { name: "Access Bank", code: "044" },
  { name: "Access Bank (Diamond)", code: "063" },
  { name: "FBN (First Bank)", code: "011" },
  { name: "GTBank", code: "058" },
  { name: "UBA", code: "033" },
  { name: "Zenith Bank", code: "057" },
  { name: "FCMB", code: "214" },
  { name: "Fidelity Bank", code: "070" },
  { name: "Keystone Bank", code: "082" },
  { name: "Polaris Bank", code: "076" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank", code: "032" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Stanbic IBTC", code: "221" },
  { name: "EcoBank", code: "050" },
  // Digital / MFB
  { name: "Kuda MFB", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "Opay (Paycom)", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Rubies MFB", code: "125" },
  { name: "VFD MFB", code: "566" },
  { name: "Titan Trust Bank", code: "102" },
  { name: "Providus Bank", code: "101" },
  { name: "PremiumTrust Bank", code: "105" },
  { name: "Globus Bank", code: "103" },
];

type SavedBank = {
  bank: Bank;
  accountNumber: string;
  accountName: string;
};

export default function WithdrawalBank() {
  const router = useRouter();

  // form state
  const [bank, setBank] = useState<Bank | null>(null);
  const [acct, setAcct] = useState("");
  const [pin, setPin] = useState("");
  const [acctName, setAcctName] = useState("");
  const [resolving, setResolving] = useState(false);

  // saved state (view mode)
  const [saved, setSaved] = useState<SavedBank | null>(null);

  // UI state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull any existing saved details
  useEffect(() => {
    try {
      const raw = localStorage.getItem("lw_withdrawal_bank");
      if (raw) setSaved(JSON.parse(raw));
    } catch {}
  }, []);

  // Auto-resolve account name when bank + 10-digit account number
  useEffect(() => {
    const canResolve = bank && acct.replace(/\D/g, "").length === 10;
    if (!canResolve) {
      setAcctName("");
      return;
    }
    let cancelled = false;
    (async () => {
      setResolving(true);
      setError(null);
      try {
        // 👉 Replace this with your real "name enquiry" endpoint.
        await new Promise((r) => setTimeout(r, 600));
        if (!cancelled) {
          // Dummy “resolved” name using simple deterministic string (pretend backend response)
          const fake = "KAZEEM ABIONA ADESINA";
          setAcctName(fake);
        }
      } catch {
        if (!cancelled) setError("Couldn’t resolve account name. Try again.");
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bank, acct]);

  const hasAllInputs =
    !!bank && acct.length === 10 && acctName && pin.length === 4;

  async function onConfirm() {
    setError(null);

    // Verify 4-digit transaction PIN (read what you saved on the PIN page)
    const stored = localStorage.getItem("lw_tx_pin");
    if (!stored) {
      setError("You haven’t set a Transaction PIN. Please set it first.");
      return;
    }
    if (pin !== stored) {
      setError("Transaction PIN is incorrect.");
      return;
    }

    // Call your “save bank” endpoint here…
    await new Promise((r) => setTimeout(r, 700));

    const s: SavedBank = {
      bank: bank!,
      accountNumber: acct,
      accountName: acctName,
    };
    setSaved(s);
    try {
      localStorage.setItem("lw_withdrawal_bank", JSON.stringify(s));
    } catch {}

    // Reset entry controls and show success bottom sheet
    setPin("");
    setSuccessOpen(true);
  }

  function startChangeBank() {
    // clear inputs; keep current saved card at top like your mock
    setBank(null);
    setAcct("");
    setAcctName("");
    setPin("");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-sm mx-auto px-5 pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-700 hover:text-black"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Back</span>
        </button>

        <h1 className="mt-4 text-[22px] font-extrabold text-black">
          Withdrawal Bank
        </h1>
        <p className="mt-2 text-[13px] text-gray-700 leading-relaxed">
          Your funds will be sent here instantly when you withdraw from Little
          Wheel.
        </p>

        {/* Saved card (when a bank has been confirmed) */}
        {saved && (
          <div className="mt-5">
            <div className="w-full rounded-xl bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-start gap-3">
                {/* optional logo; using text fallback */}
                <div className="mt-[2px] w-6 h-6 rounded bg-white/10 flex items-center justify-center text-[10px] uppercase">
                  {bankLogoText(saved.bank.name)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-tight">
                    {toTitle(saved.accountName)}
                  </div>
                  <div className="text-[12px] text-white/70 mt-0.5">
                    {saved.accountNumber}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(saved.accountNumber);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition"
                aria-label="Copy account number"
              >
                <Copy className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Change bank select (starts new flow) */}
            <div className="mt-4">
              <label className="block text-[12px] text-gray-700 mb-1">
                Change your bank
              </label>
              <button
                onClick={() => {
                  startChangeBank();
                  setPickerOpen(true);
                }}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between"
              >
                <span className={bank ? "text-gray-900" : "text-gray-400"}>
                  Select Bank
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* Entry form (for new add OR when changing bank) */}
        {!saved || (saved && (!bank || acct || acctName || pin)) ? (
          <div className="mt-5">
            {/* Bank name */}
            {!saved && (
              <label className="block text-[12px] text-gray-700 mb-1">
                Bank name
              </label>
            )}
            {!bank ? (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between"
              >
                <span className="text-gray-400">Select Bank</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            ) : (
              <button
                onClick={() => setPickerOpen(true)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-left text-[13px] flex items-center justify-between"
              >
                <span className="text-gray-900">{bank.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            )}

            {/* Account number */}
            <div className="mt-5">
              <label className="block text-[12px] text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g 3120221108"
                value={acct}
                onChange={(e) =>
                  setAcct(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
              />
            </div>

            {/* Black name chip – only when resolved */}
            {acctName && (
              <div className="mt-3">
                <div className="w-full h-10 rounded-lg bg-black text-white text-[12px] font-semibold flex items-center px-4">
                  {toTitle(acctName)}
                </div>
              </div>
            )}

            {/* Transaction PIN */}
            <div className="mt-6">
              <label className="block text-[12px] text-gray-700 mb-1">
                Your 4-DIGIT Transaction PIN
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
                  value={pin}
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="flex-1 h-11 w-5 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
                />
                <a
                  href="/dash/components/settings/security/transaction-pin"
                  className="text-[13px] underline underline-offset-2 text-gray-800"
                >
                  Or Set Transaction PIN
                </a>
              </div>
            </div>

            {/* Note box */}
            <div className="mt-8 rounded-xl bg-gray-50 border border-gray-100 p-3">
              <div className="text-[11px] font-semibold text-gray-700 mb-1">
                NOTE
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Kindly ensure that your bank account name is the same with your
                Little Wheel name. Thanks for your continuous understanding.
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="mt-3 text-[12px] text-red-600" role="alert">
                {error}
              </p>
            )}

            {/* Confirm */}
            <button
              onClick={onConfirm}
              disabled={!hasAllInputs || resolving}
              className={`mt-5 mb-8 w-full h-12 rounded-xl font-semibold text-white transition
                ${
                  hasAllInputs && !resolving
                    ? "bg-black hover:bg-black/90"
                    : "bg-black/30 cursor-not-allowed"
                }`}
            >
              {resolving ? "Resolving…" : "Confirm Bank"}
            </button>
          </div>
        ) : null}
      </div>

      {/* Bank picker bottom sheet */}
      {pickerOpen && (
        <BankPickerSheet
          onClose={() => setPickerOpen(false)}
          onPick={(b) => {
            setPickerOpen(false);
            setBank(b);
            setAcct("");
            setAcctName("");
            setPin("");
          }}
        />
      )}

      {/* Success bottom sheet */}
      <SuccessSheet
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        title="Success"
        text="You’ve successfully added a new bank account"
      />
    </div>
  );
}

/* ---------- Helpers & small components ---------- */

function toTitle(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function bankLogoText(name: string) {
  const parts = name.split(" ");
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase();
}

function BankPickerSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (b: Bank) => void;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return BANKS;
    return BANKS.filter((b) => b.name.toLowerCase().includes(t));
  }, [q]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl">
        <div className="mx-auto max-w-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="h-1 w-12 rounded-full bg-gray-200 mx-auto" />
          </div>
          <h3 className="text-[15px] font-semibold mb-3">Select Bank</h3>

          <div className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto -mx-2">
            {list.map((b) => (
              <button
                key={b.code + b.name}
                onClick={() => onPick(b)}
                className="w-full text-left px-2 py-3 border-b border-gray-100 hover:bg-gray-50"
              >
                <span className="text-[13px] text-gray-900">{b.name}</span>
              </button>
            ))}
            {list.length === 0 && (
              <div className="px-2 py-6 text-[13px] text-gray-500">
                No banks found.
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full h-10 rounded-xl bg-gray-100 text-gray-800 text-[13px] font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessSheet({
  open,
  onClose,
  title,
  text,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl p-6 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-black" />
          </div>
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-[13px] text-gray-600 mb-6">{text}</p>
          <button
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-black text-white font-semibold hover:bg-black/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
