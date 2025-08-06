"use client";

import { useState } from "react";
import { Button } from "@littlewheel/components/ui/button";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";
import { X } from "lucide-react";
import HalfEyeIcon from "../../../public/uploads/half-eye-icon";
import { BiSolidCopy } from "react-icons/bi";
import { PiInfo, PiMoonFill } from "react-icons/pi";
import { IoSunny, IoPartlySunny } from "react-icons/io5";
import TotalAgents from "./components/total-agents";
import { toast } from "sonner";

export default function ActivatorsPage() {
  const getTimeInfo = () => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return {
        greeting: "Morning",
        icon: <IoSunny color="#FFA500" size={20} />,
      };
    } else if (hour >= 12 && hour < 17) {
      return {
        greeting: "Afternoon",
        icon: <IoPartlySunny color="#FF6B35" size={20} />,
      };
    } else {
      return {
        greeting: "Evening",
        icon: <PiMoonFill color="#4A90E2" size={20} />,
      };
    }
  };

  const { greeting, icon } = getTimeInfo();
  const target = [
    {
      title: "Number of agents you must onboard",
      percentage: "20%",
      color: "#F56630",
      start: 0,
      end: 200,
    },
    {
      title: "Number of customers your agents must onboard",
      percentage: "0%",
      color: "#FFA722",
      start: 0,
      end: 200,
    },
    {
      title: "Total overall amount your agents must recharge in their wallet",
      percentage: "0%",
      color: "#3A6BFF",
      start: "₦0.00",
      end: "₦300,000",
    },
  ];

  const [showTarget, setShowTarget] = useState(false);
  const handleShowTarget = () => {
    setShowTarget((prev) => !prev);
  };

  const handleClose = () => {
    setShowTarget(false);
  };

  const referralLink = "https://www.littlewheel.com/OR39"; // This should be dynamic from props or API

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3">
        <div className="h-fit rounded-md bg-black text-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="font-bold flex items-center gap-2">
              {greeting} Origold
              {icon}
            </h1>
            {!showTarget ? (
              <Button
                className="bg-white hover:bg-gray-300 text-black flex items-center gap-2"
                onClick={handleShowTarget}
              >
                <HalfEyeIcon />
                <span className="text-sm">My target</span>
              </Button>
            ) : (
              <button
                onClick={handleClose}
                title="close"
                className="flex items-center gap-1 cursor-pointer text-white"
              >
                <X />
                <span className="text-sm hover:underline">Close</span>
              </button>
            )}
          </div>

          <p className="text-sm text-[#E4E7EC] leading-relaxed">
            You can also share your personal referral link by copying or sharing
            it on your social media.
          </p>

          <div className="relative">
            <div className="bg-white text-black p-4 space-y-3 rounded-t-lg relative">
              <h2 className="text-lg flex items-center gap-3 text-black">
                Monthly Target
                <PiInfo size={20} />
              </h2>

              {showTarget && (
                <div className="space-y-4">
                  {target.map((t, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {t.title}
                      </p>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: t.percentage,
                            backgroundColor: t.color,
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">
                          {t.start} • {t.end}
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: t.color }}
                        >
                          {t.percentage}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full h-3 overflow-hidden">
              <svg
                width="100%"
                height="12"
                viewBox="0 0 400 12"
                preserveAspectRatio="none"
                className="w-full h-full rotate-180"
              >
                <path
                  d="M0,0 C20,12 40,12 60,0 C80,12 100,12 120,0 C140,12 160,12 180,0 C200,12 220,12 240,0 C260,12 280,12 300,0 C320,12 340,12 360,0 C380,12 400,12 400,0 L400,12 L0,12 Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          <div className="bg-[#F2F5FF] rounded-md p-2 flex items-center justify-between">
            <span className="text-sm text-[#1D2739]">{referralLink}</span>
            <div
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(referralLink);
                  toast.success("Link copied to clipboard!");
                } catch {
                  toast.error("Failed to copy Llnk.");
                }
              }}
              className="bg-[#3A6BFF] text-white rounded-full p-2 flex items-center gap-2 text-xs cursor-pointer"
            >
              <BiSolidCopy size={16} />
              <span>Copy</span>
            </div>
          </div>
        </div>

        <TotalAgents />
      </div>
    </ScrollArea>
  );
}
