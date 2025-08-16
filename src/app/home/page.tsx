"use client";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import HomeScreen from "./home";
import Testimonials from "./testimonials";
// import About from "./about";
import Services from "./services";
import Faq from "./faq";
import Waitlist from "./waitlist";
import Footer from "@littlewheel/components/footer";
import Header from "@littlewheel/components/header";
export default function LandingPage() {
  return (
    <div className="h-screen bg-[#F9FAFB] w-full m-0 p-0 overflow-hidden text-black">
      <Header />

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="h-full">
          <HomeScreen />
          {/* <About /> */}
          <Services />
          <Testimonials />
          <Faq />
          <Waitlist />
          <Footer />
        </div>
      </ScrollArea>
    </div>
  );
}
