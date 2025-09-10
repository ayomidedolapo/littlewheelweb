"use client";
import { usePathname } from "next/navigation";
import Header from "./header";

export default function ConditionalHeader() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/home";

  return !isLandingPage ? <Header /> : null;
}
