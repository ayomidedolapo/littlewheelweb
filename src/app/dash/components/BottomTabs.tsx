"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Home, Users2, Wallet, PiggyBank } from "lucide-react";

type TabKey = "home" | "customers" | "earnings" | "performance";

const TABS: {
  key: TabKey;
  label: string;
  Icon: React.ComponentType<any>;
  route: string;
}[] = [
  { key: "home", label: "Home", Icon: Home, route: "./dash" },
  { key: "customers", label: "Customers", Icon: Users2, route: "./customer" },
  { key: "earnings", label: "Earnings", Icon: Wallet, route: "./earnings" },
  {
    key: "performance",
    label: "Performance",
    Icon: PiggyBank,
    route: "./performance",
  },
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

  useEffect(() => setActive(value), [value]);

  // Update active tab based on current pathname
  useEffect(() => {
    const currentTab = TABS.find((tab) =>
      pathname.includes(tab.route.replace("./", ""))
    );
    if (currentTab) {
      setActive(currentTab.key);
    }
  }, [pathname]);

  const colPct = 100 / TABS.length;
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => t.key === active)
  );

  const select = (key: TabKey) => {
    const selectedTab = TABS.find((tab) => tab.key === key);
    if (selectedTab) {
      setActive(key);
      onChange?.(key);
      router.push(selectedTab.route);
    }
  };

  return (
    <nav className={`bg-white ${className}`}>
      <div className="relative">
        {/* Tabs row (in flow, not fixed) */}
        <div className="grid grid-cols-4">
          {TABS.map(({ key, label, Icon }) => {
            const selected = key === active;
            return (
              <button
                key={key}
                onClick={() => select(key)}
                className="py-3 flex flex-col items-center justify-center gap-1"
                aria-current={selected ? "page" : undefined}
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
  );
}
