"use client";

// app/contacts/page.tsx
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string;
};

const MOCK_CONTACTS: Contact[] = [
  { id: "c1", name: "Ada", phone: "07038473798" },
  { id: "c2", name: "Amaka", phone: "08092135478" },
  { id: "c3", name: "Amanda", phone: "08092135478" },
  { id: "c4", name: "Amanda", phone: "08092135478" },
  { id: "c5", name: "Emeka", phone: "08057858865" },
  { id: "c6", name: "Rofown Classic", phone: "08057858865" },
  { id: "c7", name: "Rofown Classic", phone: "08057858865" },
  { id: "c8", name: "Rofown Classic", phone: "08057858865" },
];

function initials(name: string) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase();
}

export default function ContactsPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const contacts = MOCK_CONTACTS;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((c) => {
      const name = c.name.toLowerCase();
      const phone = c.phone.replace(/\s+/g, "");
      return name.includes(query) || phone.includes(query);
    });
  }, [q, contacts]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [selectedId, contacts]
  );

  function onNext() {
    if (!selected) return;

    // For later wiring:
    // 1) Either push with query param:
    // router.push(`/airtime?phone=${encodeURIComponent(selected.phone)}`);
    //
    // 2) Or store to localStorage then router.back(), and Airtime reads it on focus.

    try {
      localStorage.setItem("lw_billpay_selected_phone", selected.phone);
    } catch {}

    router.back();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
        {/* Back */}
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white">
            <ArrowLeft className="h-4 w-4 text-gray-800" />
          </span>
          <span className="text-sm text-gray-900">Back</span>
        </button>

        {/* Title */}
        <h1 className="mt-4 text-[22px] font-extrabold text-gray-900">
          Select contact
        </h1>

        {/* Search */}
        <div className="mt-4">
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contact"
              className="w-full bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="mt-4 space-y-4">
          {filtered.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className="w-full"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      "flex h-12 w-12 items-center justify-center rounded-2xl border",
                      active
                        ? "border-gray-400 bg-gray-200"
                        : "border-gray-300 bg-gray-200",
                    ].join(" ")}
                  >
                    <span className="text-[13px] font-semibold text-gray-900">
                      {initials(c.name)}
                    </span>
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-[14px] font-extrabold text-gray-900 leading-tight">
                      {c.name}
                    </p>
                    <p className="mt-1 text-[12px] text-gray-600">
                      {c.phone}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Next bar */}
      <div className="fixed inset-x-0 bottom-0 bg-white">
        <div className="mx-auto w-full max-w-md px-4 pb-5 pt-3">
          <button
            type="button"
            onClick={onNext}
            disabled={!selected}
            className={[
              "w-full h-14 rounded-2xl font-semibold transition",
              selected
                ? "bg-black text-white active:scale-[0.99]"
                : "bg-black/50 text-white cursor-not-allowed",
            ].join(" ")}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
