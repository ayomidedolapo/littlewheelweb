"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Users2 } from "lucide-react";

type TabKey = "home" | "customers";

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<any>;
  route: string;
}[] = [
  { key: "home", label: "Home", Icon: Home, route: "./dash" },
  { key: "customers", label: "Customers", Icon: Users2, route: "./customer" },
];

/* ---------- tiny spinner + overlay ---------- */
function Spinner({ className = "w-4 h-4 text-black" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        className="opacity-90"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}
function LoadingOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[1px] flex items-center justify-center"
    >
      <div className="rounded-xl bg-white px-4 py-3 shadow-2xl flex items-center gap-3">
        <Spinner className="w-5 h-5" />
        <span className="text-[13px] font-semibold text-gray-900">
          Loading…
        </span>
      </div>
    </div>
  );
}

export default function InlineTabs({
  value = "home",
  onChange,
  className = "",
}: {
  value?: TabKey;
  onChange?: (t: TabKey) => void;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<TabKey>(value);

  // track route transition state
  const [isPending, startTransition] = useTransition();

  useEffect(() => setActive(value), [value]);

  // Update active tab based on current pathname
  useEffect(() => {
    const current = TABS.find((tab) =>
      pathname.includes(tab.route.replace("./", ""))
    );
    if (current) setActive(current.key);
  }, [pathname]);

  // Prefetch tab routes for snappier transitions
  useEffect(() => {
    TABS.forEach((t) => {
      try {
        // Next automatically resolves relative path from current route
        router.prefetch(t.route);
      } catch {}
    });
  }, [router]);

  const colPct = 100 / TABS.length;
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.key === active)
  );

  const select = (key: TabKey) => {
    const selectedTab = TABS.find((tab) => tab.key === key);
    if (!selectedTab) return;
    setActive(key);
    onChange?.(key);

    // show overlay while navigating
    startTransition(() => {
      router.push(selectedTab.route);
    });
  };

  const disabled = isPending;

  return (
    <>
      {/* global overlay while routing */}
      <LoadingOverlay show={isPending} />

      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] ${className}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
        aria-busy={disabled}
      >
        <div className="relative max-w-md mx-auto">
          {/* Tabs row */}
          <div className="grid grid-cols-2">
            {TABS.map(({ key, label, Icon }) => {
              const selected = key === active;
              return (
                <button
                  key={key}
                  onClick={() => select(key)}
                  className="py-3 flex flex-col items-center justify-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-current={selected ? "page" : undefined}
                  disabled={disabled}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      selected ? "text-black" : "text-slate-500"
                    }`}
                    strokeWidth={selected ? 2.6 : 2}
                  />
                  <span
                    className={`text-[11px] ${
                      selected ? "text-black font-bold" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Rounded indicator */}
          <div className="absolute left-0 right-0 -bottom-1.5 h-3 pointer-events-none">
            <div
              className="absolute inset-y-0"
              style={{ left: `${colPct * activeIndex}%`, width: `${colPct}%` }}
            >
              <div className="mx-auto mt-[6px] h-0.5 w-20 rounded-full bg-black" />
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
