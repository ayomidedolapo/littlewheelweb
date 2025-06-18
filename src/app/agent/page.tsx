"use client";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import HomeScreen from "./home";
import GetStarted from "./get-started";
import AgentKnowlege from "./agent-knowlege";
import Testimonials from "./testimonials";
import CustomerAgent from "./customer-agent";
import Faq from "./faq";
import BecomeAgent from "./become-agent";
import AgentHeader from "./component/agent-header";
import AgentFooter from "./component/agent-footer";
export default function LandingPage() {
  return (
    <div className="h-screen bg-[#F9FAFB] w-full m-0 p-0 overflow-hidden text-black">
      <AgentHeader />

      <ScrollArea className="h-[calc(100vh-64px)]">
        <div className="h-full">
          <HomeScreen />
          <GetStarted />
          <AgentKnowlege />
          <Testimonials />
          <CustomerAgent />
          <Faq />
          <BecomeAgent />
          <AgentFooter />
        </div>
      </ScrollArea>
    </div>
  );
}
