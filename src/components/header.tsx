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
        <Link href="/">
          <AppleWhite />
        </Link>
        <Link href="/">
          <PlayStoreWhite />
        </Link>
      </div>

      {isNavOpen && (
        <nav className="md:hidden absolute top-0 right-0 w-full h-full bg-white text-black flex justify-center shadow-2xl rounded-b-lg z-50">
          <span className="h-1/2 w-3/4 flex flex-col items-center justify-around my-10">
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

            <Button
              onClick={() => {
                scrollToSection("waitlist");
                toggleNav();
              }}
              className="flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold mt-4"
            >
              <HiUserGroup size={24} />
              Join the waitlist
            </Button>
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
