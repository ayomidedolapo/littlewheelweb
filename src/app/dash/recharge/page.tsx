"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

/* money helpers */
const fmt = (n: number) =>
  `₦${(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const parseNG = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

type Bank = {
  id: "wema" | "opay" | "fcmb";
  name: string;
  logoUrls: string[];
  health: string;
};

/* Logo that falls back to initials if a URL fails */
function BankLogo({ name, urls }: { name: string; urls: string[] }) {
  const [ix, setIx] = useState(0);
  const tryNext = () => setIx((p) => (p + 1 < urls.length ? p + 1 : p));
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (!urls[ix]) {
    return (
      <div className="h-7 w-7 rounded-full bg-gray-200 text-gray-700 text-[10px] font-bold grid place-items-center">
        {initials}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={urls[ix]}
      alt={`${name} logo`}
      className="h-7 w-7 object-contain rounded-sm bg-white"
      onError={tryNext}
    />
  );
}

export default function CreditRechargePage() {
  const router = useRouter();

  const currentBalance = 200_000;

  const [amountRaw, setAmountRaw] = useState("400000");
  const amount = useMemo(() => parseNG(amountRaw), [amountRaw]);

  const [selectOpen, setSelectOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);

  const banks: Bank[] = [
    {
      id: "wema",
      name: "WEMA BANK",
      health: "100%",
      logoUrls: [
        "https://logo.clearbit.com/wemabank.com",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Wema_Bank_logo.png/240px-Wema_Bank_logo.png",
      ],
    },
    {
      id: "opay",
      name: "OPAY",
      health: "100%",
      logoUrls: [
        "https://logo.clearbit.com/opayweb.com",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/OPay_logo.svg/256px-OPay_logo.svg.png",
      ],
    },
    {
      id: "fcmb",
      name: "FCMB",
      health: "100%",
      logoUrls: [
        "https://logo.clearbit.com/fcmb.com",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/FCMB_Logo.png/256px-FCMB_Logo.png",
      ],
    },
  ];
  const [bankId, setBankId] = useState<Bank["id"]>("wema");
  const chosen = banks.find((b) => b.id === bankId)!;

  /* bank-specific account numbers */
  const accountNumber =
    bankId === "opay"
      ? "7088867396"
      : bankId === "fcmb"
      ? "2005987367"
      : "0126461853";
  const accountName = "Little Wheel Tech Ltd";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const quick = (n: number) => setAmountRaw(String(n));
  const proceed = () => setSelectOpen(true);
  const sentMoney = () => {
    setSelectOpen(false);
    setPendingOpen(true);
  };

  return (
    <div className="min-h-screen bg-white flex items-start justify-center p-0 md:p-4">
      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .sheet {
          animation: slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

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

        {/* Title */}
        <div className="px-4">
          <h1 className="text-xl font-extrabold text-gray-900">
            Credit Recharge
          </h1>
          <p className="text-[12px] text-gray-600 mt-1 mb-4">
            Load credit to serve customers
          </p>
        </div>

        {/* Card */}
        <div className="px-4">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <label className="block text-[12px] font-semibold text-gray-800 mb-2">
              Amount to recharge
            </label>
            <input
              value={amountRaw}
              onChange={(e) =>
                setAmountRaw(e.target.value.replace(/[^\d]/g, ""))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-black"
              placeholder="₦0"
            />

            <p className="mt-3 text-[12px]">
              Current credit balance:{" "}
              <span className="font-semibold text-emerald-600">
                {fmt(currentBalance)}
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {[2000, 5000, 10000, 20000].map((n) => (
                <button
                  key={n}
                  onClick={() => quick(n)}
                  className={`h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                    parseNG(amountRaw) === n
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {fmt(n)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Big bottom CTA */}
        <div className="px-4 pt-10 pb-6 mt-auto">
          <button
            onClick={proceed}
            disabled={amount <= 0}
            className={`w-full h-12 rounded-2xl font-semibold ${
              amount > 0
                ? "bg-black text-white hover:bg-black/90"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Proceed
          </button>
        </div>
      </div>

      {/* Sheet 1: Select bank / transfer details (PLAIN text section like screenshot) */}
      {selectOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSelectOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-5 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-4" />
            <p className="text-[12px] text-gray-600 mb-3">
              Proceed to your bank app to complete this transfer.
            </p>

            {/* Bank list */}
            <p className="text-[12px] font-semibold text-gray-800 mb-2">
              Select from Available Banks
            </p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              {banks.map((b, i) => (
                <label
                  key={b.id}
                  className={`flex items-center justify-between px-3 py-3 bg-white cursor-pointer ${
                    i !== banks.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="bank"
                      checked={bankId === b.id}
                      onChange={() => setBankId(b.id)}
                      className="accent-black"
                    />
                    <BankLogo name={b.name} urls={b.logoUrls} />
                    <span className="text-sm font-semibold text-gray-900">
                      {b.name}
                    </span>
                  </div>
                  <span className="text-[12px] font-semibold text-emerald-600">
                    {b.health}
                  </span>
                </label>
              ))}
            </div>

            {/* Details – plain text rows (no boxes) */}
            <div className="mt-4 space-y-3">
              <PlainDetail
                label="AMOUNT TO SEND"
                value={`NGN ${amount.toLocaleString("en-NG")}`}
                canCopy
                onCopy={() => copy(String(amount))}
              />
              <PlainDetail
                label="ACCOUNT NUMBER"
                value={accountNumber}
                canCopy
                onCopy={() => copy(accountNumber)}
              />
              <PlainDetail label="BANK NAME" value={chosen.name} />
              <PlainDetail label="ACCOUNT NAME" value={accountName} />
            </div>

            <button
              onClick={sentMoney}
              className="mt-5 w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              I’ve sent the money
            </button>
          </div>
        </div>
      )}

      {/* Sheet 2: Transaction Pending */}
      {pendingOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPendingOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl p-6 shadow-2xl sheet">
            <div className="mx-auto h-1.5 w-16 rounded-full bg-gray-200 mb-5" />
            <div className="mx-auto h-24 w-24 rounded-full bg-gray-50 ring-gray-50 grid place-items-center mb-4">
              <Check className="w-10 h-10 text-gray-400" />
            </div>

            <div className="mx-auto mb-2 ml-20 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-amber-50 text-amber-700">
              <RefreshCw className="w-4 h-4 animate-spin-slow" />
              <span className="text-[12px] font-semibold">
                Transaction Pending
              </span>
            </div>

            <p className="text-sm text-gray-600 text-center">
              Your transfer is being processed
            </p>

            <button
              onClick={() => router.push("/dash")}
              className="mt-6 w-full h-12 rounded-2xl bg-black text-white font-semibold hover:bg-black/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .animate-spin-slow {
          animation: spin 2.2s linear infinite;
        }
      `}</style>
    </div>
  );
}

/* Plain detail row like your screenshot (label + value + black copy pill) */
function PlainDetail({
  label,
  value,
  canCopy,
  onCopy,
}: {
  label: string;
  value: string;
  canCopy?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="bg-white">
      <p className="text-[11px] font-semibold text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">{value}</span>
        {canCopy && (
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-black text-white px-2.5 py-1 rounded-md active:scale-[0.98]"
            title="Copy"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        )}
      </div>
    </div>
  );
}
