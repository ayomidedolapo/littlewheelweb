"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import LogoSpinner from "../../../components/loaders/LogoSpinner";

type TabKey = "home" | "customers";

const TABS = [
  {
    key: "home",
    label: "Home",
    iconLight: "/uploads/homeicons.png",
    iconDark: "/uploads/iconhomedark.png",
    route: "./dash",
  },
  {
    key: "customers",
    label: "Customers",
    iconLight: "/uploads/customericon.png",
    iconDark: "/uploads/iconcustomerdark.png",
    route: "./customer",
  },
];

export default function InlineTabs({ value = "home", onChange, className = "" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState<TabKey>(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setActive(value), [value]);

  useEffect(() => {
    const current = TABS.find((tab) =>
      pathname.includes(tab.route.replace("./", ""))
    );
    if (current) setActive(current.key);
  }, [pathname]);

  useEffect(() => {
    TABS.forEach((t) => {
      try {
        router.prefetch(t.route);
      } catch {}
    });
  }, [router]);

  const select = (key: TabKey) => {
    const tab = TABS.find((t) => t.key === key);
    if (!tab) return;

    setActive(key);
    onChange?.(key);

    startTransition(() => {
      router.push(tab.route);
    });
  };

  const colPct = 100 / TABS.length;
  const activeIndex = TABS.findIndex((t) => t.key === active);

  return (
    <>
      <LogoSpinner show={isPending} />

      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] ${className}`}
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <div className="relative max-w-md mx-auto">
          <div className="grid grid-cols-2">
            {TABS.map(({ key, label, iconLight, iconDark }) => {
              const selected = key === active;

              const iconSrc = selected ? iconDark : iconLight;

              return (
                <button
                  key={key}
                  onClick={() => select(key)}
                  className="py-3 flex flex-col items-center justify-center gap-1"
                >
                  {/* ICON SWITCH */}
                  <Image
                    src={iconSrc}
                    alt={label}
                    width={22}
                    height={22}
                    className="transition-all duration-200"
                  />

                  {/* TEXT COLOR */}
                  <span
                    className={`text-[11px] transition ${
                      selected ? "text-[#000000] font-bold" : "text-[#667185]"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Indicator Bar */}
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
