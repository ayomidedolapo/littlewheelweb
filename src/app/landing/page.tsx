"use client";
import { useEffect, useState } from "react";
import { Button } from "@littlewheel-landing/components/ui/button";
import { FaBars, FaTimes } from "react-icons/fa";
import { ScrollArea } from "@littlewheel-landing/components/ui/scroll-area";
import { HiUserGroup } from "react-icons/hi2";
import HomeScreen from "./home";
import Testimonials from "./testimonials";
import About from "./about";
import Services from "./services";
import { cn } from "@littlewheel-landing/lib/utils";
import Faq from "./faq";
import Waitlist from "./waitlist";
import Footer from "./footer";

const navigationList = [
  { id: 1, title: "Home", to: "home" },
  { id: 2, title: "About Us", to: "about" },
  { id: 3, title: "Our Services", to: "services" },
  { id: 5, title: "FAQ", to: "faq" },
];

export default function Page() {
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
    <div className="h-screen bg-[#F9FAFB] w-full m-0 p-0 overflow-hidden text-black">
      <header
        className={cn(
          "fixed top-0 left-0 right-0 px-10 py-4 flex items-center justify-between z-50 transition-all duration-300",
          isScrolledIn
            ? "bg-background/80 backdrop-blur-md shadow-md"
            : "bg-transparent"
        )}
        style={{
          height: "64px",
          minHeight: "64px",
        }}
      >
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

        <div className="md:hidden">
          <button onClick={toggleNav} className="focus:outline-none">
            {isNavOpen ? (
              <FaTimes size={24} color="black" />
            ) : (
              <FaBars size={24} color="black" />
            )}
          </button>
        </div>
        <Button
          onClick={() => scrollToSection("waitlist")}
          className="hidden md:flex items-center gap-2 bg-black px-4 py-5 text-white hover:bg-[#474747] hover:font-bold"
        >
          <HiUserGroup size={24} />
          Join the waitlist
        </Button>
      </header>

      <div className="pt-16 h-full">
        <ScrollArea className="h-[calc(100vh-64px)]">
          <div className="h-full">
            <HomeScreen />
            <Testimonials />
            <About />
            <Services />
            <Faq />
            <Waitlist />
            <Footer />
          </div>
        </ScrollArea>
      </div>

      {isNavOpen && (
        <nav className="md:hidden absolute top-16 right-0 w-1/2 h-2/5 bg-white/80 flex flex-col items-center justify-center shadow-2xl rounded-b-lg z-50">
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
        </nav>
      )}
    </div>
  );
}
