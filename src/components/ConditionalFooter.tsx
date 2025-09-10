"use client";
import { usePathname } from "next/navigation";
import Footer from "./footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isLandingPage = pathname === "/home";

  return !isLandingPage ? <Footer /> : null;
}
