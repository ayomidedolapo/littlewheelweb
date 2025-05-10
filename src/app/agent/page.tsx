"use client";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import HomeScreen from "./home";
import Footer from "@littlewheel/components/footer";
import Header from "@littlewheel/components/header";
import GetStarted from "./get-started";
import AgentKnowlege from "./agent-knowlege";
import Testimonials from "./testimonials";
import CustomerAgent from "./customer-agent";
import Faq from "./faq";
import BecomeAgent from "./become-agent";
export default function LandingPage() {
  return (
    <div className="h-screen bg-[#F9FAFB] w-full m-0 p-0 overflow-hidden text-black">
      <Header />

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="h-full">
          <HomeScreen />
          <GetStarted />
          <AgentKnowlege />
          <Testimonials />
          <CustomerAgent />
          <Faq />
          <BecomeAgent />
          <Footer />
        </div>
      </ScrollArea>
    </div>
  );
}
