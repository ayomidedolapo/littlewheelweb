"use client";
import { usePathname } from "next/navigation";
import Header from "./header";

export default function ConditionalHeader() {
  const pathname = usePathname();
  const hiddenRoutes =
    pathname === "/home" || pathname.startsWith("/activators");

  return hiddenRoutes ? null : <Header />;
}
