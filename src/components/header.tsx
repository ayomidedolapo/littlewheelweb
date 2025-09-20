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
import { usePathname } from "next/navigation";

const navigationList = [
  { title: "Activators", to: "/activators", type: "link" },
  { title: "Agents", to: "/agent", type: "link" },
  {
    title: "Research",
    to: "https://littlewheel.medium.com/market-research-and-analysis-for-little-wheel-6e828a1833f0",
    type: "external",
  },
  // { title: "Gallery", to: "/gallery", type: "link" },
  // { title: "Team", to: "/team", type: "link" },
];

export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolledIn, setIsScrolledIn] = useState(false);
  const [activeNav, setActiveNav] = useState<string>("");
  const pathname = usePathname();

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  // Set active nav based on current pathname
  useEffect(() => {
    const currentNav = navigationList.find(
      (nav) => nav.type === "link" && pathname === nav.to
    );
    if (currentNav) {
      setActiveNav(currentNav.title);
    }
  }, [pathname]);

  const handleNavClick = (nav: (typeof navigationList)[0]) => {
    if (nav.type === "link") {
      setActiveNav(nav.title);
    }
    setIsNavOpen(false); // Close mobile menu on click
  };

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
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center gap-8">
        {/* Logo placeholder - you can replace the src with your logo URL */}
        <Image
          src="/uploads/logo.png" // Replace this with your logo URL
          alt="Little Wheel"
          width={150}
          height={40}
          className="w-30"
          priority
        />

        {/* Navigation - only visible on large screens */}
        <nav className="hidden lg:flex gap-6 pl-22">
          {navigationList.map((nav, idx) => (
            <a
              key={idx}
              href={nav.to}
              onClick={() => handleNavClick(nav)}
              className={cn(
                "text-sm px-4 py-2 rounded-md transition-all duration-200 hover:bg-white hover:text-black hover:font-bold",
                activeNav === nav.title && "bg-white text-black font-bold"
              )}
              target={nav.type === "external" ? "_blank" : undefined}
              rel={nav.type === "external" ? "noopener noreferrer" : undefined}
            >
              {nav.title}
            </a>
          ))}
        </nav>
      </div>

      {/* Right side - Mobile menu button and app store buttons */}
      <div className="flex items-center gap-4">
        {/* Hamburger icon - visible on small and medium screens but hidden on large screens */}
        <FaBars
          size={24}
          onClick={toggleNav}
          className="hover:text-[#344054] lg:hidden"
        />

        {/* App store buttons - visible on medium screens and up with smaller size for medium screens */}
        <div className="hidden md:flex items-center gap-1 lg:gap-4">
          <button
            title="Download on the App Store"
            onClick={() =>
              toast.info(
                "iOS app is not available yet. Please check back soon!"
              )
            }
            className="cursor-pointer transform hover:scale-105 transition-transform duration-200"
          >
            <div className="md:scale-75 lg:scale-100">
              <AppleWhite />
            </div>
          </button>
          <Link
            href="https://play.google.com/store/apps/details?id=com.lilttlewheel.agentapp&hl=en"
            target="_blank"
            rel="noopener noreferrer"
            className="transform hover:scale-105 transition-transform duration-200"
          >
            <div className="md:scale-75 lg:scale-100">
              <PlayStoreWhite />
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation - now shows for both small and medium screens */}
      {isNavOpen && (
        <nav className="lg:hidden absolute top-0 right-0 w-full h-full bg-black text-white flex justify-center items-center z-50">
          <span className="h-1/2 w-3/4 flex flex-col items-center justify-around">
            {navigationList.map((nav, idx) => (
              <a
                key={idx}
                href={nav.to}
                onClick={() => handleNavClick(nav)}
                className={cn(
                  "text-sm px-4 py-2 rounded-full transition-all duration-200 hover:bg-white hover:text-black hover:font-bold",
                  activeNav === nav.title && "bg-white text-black font-bold"
                )}
                target={nav.type === "external" ? "_blank" : undefined}
                rel={
                  nav.type === "external" ? "noopener noreferrer" : undefined
                }
              >
                {nav.title}
              </a>
            ))}

            <div className="flex items-center gap-4">
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
    </header>
  );
}
