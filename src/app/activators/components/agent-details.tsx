"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@littlewheel/lib/utils";
import agentData from "@littlewheel/data/agent.json";
import { SmartAvatar } from "@littlewheel/components/smart-avatar";
import GoBack from "@littlewheel/components/go-back";
import DateFormatterToText from "@littlewheel/components/date-formatter-to-text";
import { BiSolidCopy } from "react-icons/bi";
import { toast } from "sonner";
import { Agent } from "@littlewheel/types/agents";
import { ScrollArea } from "@littlewheel/components/ui/scroll-area";

interface AgentDetailsProps {
  agentId: string;
  onBack: () => void;
}

export default function AgentDetails({ agentId, onBack }: AgentDetailsProps) {
  // Cast imported data to Agent array
  const agents = agentData as Agent[];

  // Find the specific agent
  const a = useMemo(() => {
    return agents.find((a) => a.id === agentId);
  }, [agentId, agents]);

  if (!a) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Agent Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The agent with ID {agentId} could not be found.
          </p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const fullName = [a.firstName, a.lastName].filter(Boolean).join(" ");

  // Agent information sections
  const personalInfo = [
    { label: "Full Name", value: fullName },
    { label: "Email", value: a.email },
    { label: "Gender", value: a.gender },
    {
      label: "Phone",
      value: (
        <div className="flex items-center gap-2">
          <span>{a.phone}</span>
          <span
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.phone);
                toast.success("Phone number copied to clipboard!");
              } catch {
                toast.error("Failed to copy phone number.");
              }
            }}
            className="rounded-full p-1 bg-black cursor-pointer"
          >
            <BiSolidCopy size={10} color="white" />
          </span>
        </div>
      ),
    },
    { label: "Address", value: a.Address },
  ];

  const accountInfo = [
    { label: "Agent ID", value: a.id },
    {
      label: "Status",
      value: (
        <span
          className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            a.status.toLowerCase() === "active" &&
              "bg-green-100 text-green-800",
            a.status.toLowerCase() === "inactive" &&
              "bg-gray-100 text-gray-800",
            a.status.toLowerCase() === "suspended" && "bg-red-100 text-red-800"
          )}
        >
          {a.status}
        </span>
      ),
    },
    {
      label: "Date Joined",
      value: <DateFormatterToText date={a.createdAt} />,
    },
    {
      label: "Last Active",
      value: <DateFormatterToText date={a.lastActive} mode="datetime" />,
    },
  ];

  const businessMetrics = [
    { label: "Total Customers", value: a.tot_customer },
    {
      label: "Total Amount Saved",
      value: (
        <span className="font-semibold text-green-600">
          {a.tot_amount_saved}
        </span>
      ),
    },
    { label: "Total Vaults", value: a.tot_vault },
  ];

  const InfoSection = ({
    title,
    items,
  }: {
    title: string;
    items: Array<{ label: string; value: ReactNode }>;
  }) => (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
          >
            <span className="text-gray-600 font-medium">{item.label}:</span>
            <div className="text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black/10 flex items-center justify-center fixed inset-0 z-50">
      <div className="w-full md:w-[30%] h-screen bg-white">
        <header className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] h-[10%]">
          <SmartAvatar
            data={a}
            src={a.photo}
            getKey={(a) => a.id}
            getInitialsName={() => fullName}
            getName={() => fullName}
            showName
            upContent={`Agent ID: ${a.id}`}
            upContentClassName="text-xs text-gray-500 font-mono"
          />
          <GoBack label="Back" showIcon onClick={onBack} />
        </header>
        <ScrollArea className="h-[90%]">
          <div className="space-y-4 p-4">
            <InfoSection title="Personal Information" items={personalInfo} />
            <InfoSection title="Account Information" items={accountInfo} />
            <InfoSection title="Business Metrics" items={businessMetrics} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
