"use client";
import HomeScreen from "./home";
import GetStarted from "./get-started";
import AgentKnowlege from "./agent-knowlege";
import Testimonials from "./testimonials";
import CustomerAgent from "./customer-agent";
import Faq from "./faq";
import BecomeAgent from "./become-agent";

export default function LandingPage() {
  return (
    <div className="w-full bg-black text-black">
      <HomeScreen />
      <GetStarted />
      <AgentKnowlege />
      <Testimonials />
      <CustomerAgent />
      <Faq />
      <BecomeAgent />
    </div>
  );
}
