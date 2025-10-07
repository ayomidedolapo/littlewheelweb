"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Users2 } from "lucide-react";

/* ✅ Use your logo spinner */
import LogoSpinner from "../../../components/loaders/LogoSpinner";

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

    // show logo spinner while navigating
    startTransition(() => {
      router.push(selectedTab.route);
    });
  };

  const disabled = isPending;

  return (
    <>
      {/* 🔄 Logo spinner while routing */}
      <LogoSpinner show={isPending} />

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
