"use client";
import { usePathname } from "next/navigation";
import Footer from "./footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const hiddenRoutes =
    pathname === "/home" || pathname.startsWith("/activators");

  return hiddenRoutes ? null : <Footer />;
}
