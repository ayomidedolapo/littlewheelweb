"use client";
import { usePathname } from "next/navigation";
import Header from "./header";

export default function ConditionalHeader() {
  const pathname = usePathname();

  // Show header only on /home and /agent routes
  const showHeader = pathname === "/agent" || pathname === "/agent";

  return showHeader ? <Header /> : null;
}
