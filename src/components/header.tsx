"use client";
import { cn } from "@littlewheel-landing/lib/utils";
import { useEffect, useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { HiUserGroup } from "react-icons/hi2";
import { Button } from "./ui/button";

const navigationList = [
  { id: 1, title: "Home", to: "home" },
  { id: 2, title: "About Us", to: "about" },
  { id: 3, title: "Our Services", to: "services" },
  { id: 5, title: "FAQ", to: "faq" },
];
export default function Header() {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isScrolledIn, setIsScrolledIn] = useState(false);

  const toggleNav = () => setIsNavOpen(!isNavOpen);

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Use a small threshold to prevent constant state updates
      setIsScrolledIn(window.scrollY > 10);
    };

    // Add passive option for better performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return (
    <header className="h-[10%] flex items-center justify-between px-6 py-4 shadow-md">
      <nav className="hidden md:flex gap-10">
        {navigationList.map((nav, id) => (
          <button
            key={id}
            onClick={() => scrollToSection(nav.to)}
            className="text-sm hover:font-bold hover:underline"
          >
            {nav.title}
          </button>
        ))}
      </nav>

      <img
        src="/uploads/logo.svg"
        alt="Little Wheel Logo"
        width={150}
        height={40}
        className="md:-ml-36 ml-0"
      />

      <FaBars
        size={24}
        onClick={toggleNav}
        className="hover:text-[#D42620] md:hidden"
      />
      <Button
        onClick={() => scrollToSection("waitlist")}
        className="hidden md:flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold"
      >
        <HiUserGroup size={24} />
        Join the waitlist
      </Button>

      {isNavOpen && (
        <nav className="md:hidden absolute top-0 right-0 w-full h-full bg-white flex justify-center shadow-2xl rounded-b-lg z-50 font-sans font-medium">
          <span className="h-1/2 w-3/4 flex flex-col items-center justify-around my-10">
            {navigationList.map((nav, id) => (
              <button
                key={id}
                onClick={() => {
                  scrollToSection(nav.to);
                  toggleNav();
                }}
                className="text-sm hover:font-bold hover:underline my-2"
              >
                {nav.title}
              </button>
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
    </header>
  );
}
