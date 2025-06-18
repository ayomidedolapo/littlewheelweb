/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { cn } from "@littlewheel/lib/utils";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi2";
import Image from "next/image";
import { Button } from "@littlewheel/components/ui/button";

const navigationList = [
  { id: 1, title: "Home", to: "home", type: "section" },
  { id: 2, title: "About Us", to: "about", type: "section" },
  { id: 3, title: "Our Services", to: "services", type: "section" },
  { id: 5, title: "Blog", to: "/blog", type: "link" },
];
export default function AgentHeader() {
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
    <header className="h-[10%] flex items-center justify-between px-6 py-4 shadow-md">
      <nav className="hidden md:flex gap-10">
        {navigationList.map((nav) =>
          nav.type === "section" ? (
            <button
              key={nav.id}
              onClick={() => scrollToSection(nav.to)}
              className={cn(
                "text-sm hover:font-bold hover:underline px-3 py-2 rounded-md",
                activeNav === nav.to && "bg-[#F7F9FC]"
              )}
            >
              {nav.title}
            </button>
          ) : (
            <a
              key={nav.id}
              href={nav.to}
              className="text-sm hover:font-bold hover:underline px-3 py-2 rounded-md"
            >
              {nav.title}
            </a>
          )
        )}
      </nav>

      <Image
        src="/uploads/logo.svg"
        alt="Little Wheel"
        width={150}
        height={40}
        className="md:-ml-36 ml-0"
        priority
      />

      <FaBars
        size={24}
        onClick={toggleNav}
        className="hover:text-[#344054] md:hidden"
      />
      <Button
        onClick={() => scrollToSection("waitlist")}
        className="hidden md:flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold"
      >
        <HiUserGroup size={24} />
        Become An Agent
      </Button>

      {isNavOpen && (
        <nav className="md:hidden absolute top-0 right-0 w-full h-full bg-white flex justify-center shadow-2xl rounded-b-lg z-50">
          <span className="h-1/2 w-3/4 flex flex-col items-center justify-around my-10">
            {navigationList.map((nav) =>
              nav.type === "section" ? (
                <button
                  key={nav.id}
                  onClick={() => {
                    scrollToSection(nav.to);
                    toggleNav();
                  }}
                  className={cn(
                    "text-sm hover:font-bold hover:underline my-2 px-3 py-2 rounded-md",
                    activeNav === nav.to && "bg-[#F7F9FC]"
                  )}
                >
                  {nav.title}
                </button>
              ) : (
                <a
                  key={nav.id}
                  href={nav.to}
                  onClick={toggleNav}
                  className="text-sm hover:font-bold hover:underline my-2 px-3 py-2 rounded-md"
                >
                  {nav.title}
                </a>
              )
            )}

            <Button
              onClick={() => {
                scrollToSection("waitlist");
                toggleNav();
              }}
              className="flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold mt-4"
            >
              <HiUserGroup size={24} />
              Become An Agent
            </Button>
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
