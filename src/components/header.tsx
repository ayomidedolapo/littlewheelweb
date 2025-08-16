/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { cn } from "@littlewheel/lib/utils";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi2";
import { Button } from "./ui/button";
import Image from "next/image";
import Link from "next/link";
import AppleWhite from "../../public/uploads/apple-white";
import PlayStoreWhite from "../../public/uploads/play-store-white";
import { toast } from "sonner";

const navigationList = [
  { title: "Activator", to: "/activator", type: "link" },
  { title: "Agents", to: "/agent", type: "link" },
  { title: "Research", to: "/research", type: "link" },
  { title: "Gallery", to: "/gallery", type: "link" },
  { title: "Team", to: "/team", type: "link" },
];
export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolledIn, setIsScrolledIn] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("home");

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolledIn(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return (
    <header className="h-[10%] flex items-center justify-between px-10 py-4 shadow-md bg-black text-[#F9FAFB]">
      {/* <div className="w-4/5 flex items-center justify-between"> */}
      <Image
        src="/uploads/logo.svg"
        alt="Little Wheel"
        width={150}
        height={40}
        className="md:-ml-36 ml-0"
        priority
      />
      <nav className="hidden md:flex gap-10">
        {navigationList.map((nav, idx) => (
          <a
            key={idx}
            href={nav.to}
            className={cn(
              "text-sm hover:font-bold hover:underline px-3 py-2 rounded-md",
              activeNav === nav.to && "bg-[#F7F9FC] text-black font-semibold"
            )}
          >
            {nav.title}
          </a>
        ))}
      </nav>

      <FaBars
        size={24}
        onClick={toggleNav}
        className="hover:text-[#344054] md:hidden"
      />
      <div className="hidden md:flex items-center gap-4">
        {/* <Link href="/">
                <AppleWhite />
              </Link> */}
        <button
          title="Download on the App Store"
          onClick={() =>
            toast.info("iOS app is not available yet. Please check back soon!")
          }
          className="cursor-pointer"
        >
          <AppleWhite />
        </button>
        <Link
          href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&hl=en"
          target="_blank"
          rel="noopener noreferrer"
        >
          <PlayStoreWhite />
        </Link>
      </div>

      {isNavOpen && (
        <nav className="md:hidden absolute top-0 right-0 w-full h-full bg-black text-white flex justify-center items-center z-50">
          <span className="h-1/2 w-3/4 flex flex-col items-center justify-around">
            {navigationList.map((nav, idx) => (
              <a
                key={idx}
                href={nav.to}
                className={cn(
                  "text-sm hover:font-bold hover:underline px-3 py-2 rounded-md",
                  activeNav === nav.to &&
                    "bg-[#F7F9FC] text-black font-semibold"
                )}
              >
                {nav.title}
              </a>
            ))}
            {/* <div className="flex flex-col items-center space-y-3"> */}
            <div className="flex items-center gap-4">
              {/* <Link href="/">
                <AppleWhite />
              </Link> */}
              <button
                title="Download on the App Store"
                onClick={() =>
                  toast.info(
                    "iOS app is not available yet. Please check back soon!"
                  )
                }
                className="cursor-pointer"
              >
                <AppleWhite />
              </button>
              <Link
                href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&hl=en"
                target="_blank"
                rel="noopener noreferrer"
              >
                <PlayStoreWhite />
              </Link>
            </div>
          </span>
          <FaTimes
            size={24}
            className="absolute top-4 right-8 cursor-pointer hover:text-[#D42620]"
            onClick={toggleNav}
          />
        </nav>
      )}
      {/* </div> */}
    </header>
  );
}
