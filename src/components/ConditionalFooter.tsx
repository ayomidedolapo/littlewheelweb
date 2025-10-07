"use client";
import { usePathname } from "next/navigation";
import Footer from "./footer";

export default function ConditionalFooter() {
  const pathname = usePathname();

  // Show footer only on /home and /agent routes
  const showFooter = pathname === "/" || pathname === "/";

  return showFooter ? <Footer /> : null;
}
