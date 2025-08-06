"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@littlewheel/components/ui/tabs";
import { BiSolidCopy } from "react-icons/bi";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@littlewheel/lib/utils";
import agentData from "@littlewheel/data/agent.json";
import SearchFilter from "@littlewheel/components/search-filter";
import { SmartAvatar } from "@littlewheel/components/smart-avatar";
import { ChevronDown } from "lucide-react";
import DateFormatterToText from "@littlewheel/components/date-formatter-to-text";
import { toast } from "sonner";
import { Agent } from "@littlewheel/types/agents";
import AgentDetails from "./agent-details";
import { Button } from "@littlewheel/components/ui/button";
import Loader1 from "@littlewheel/components/loaders/loader-1";

export default function TotalAgents() {
  const [activeTab, setActiveTab] = useState("all");
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Cast imported data to Agent array
  const agents = agentData as Agent[];

  // State for search filters
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  // Reset visibleCount when activeTab or filters change
  useEffect(() => {
    setVisibleCount(5);
  }, [activeTab, searchQuery, fromDate, toDate]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);

    // Simulate async delay
    setTimeout(() => {
      setVisibleCount((prev) => prev + 5);
      setIsLoadingMore(false);
    }, 500); // adjust delay as needed
  };

  const handleSeeLess = () => {
    setVisibleCount(5);
  };

  // Filter agents based on search query, date range, and active tab
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      // Tab filter
      const matchesTab =
        activeTab === "all" ||
        a.status.toLowerCase() === activeTab.toLowerCase();

      // Search query filter
      const matchesSearch =
        !searchQuery ||
        a.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.phone.includes(searchQuery) ||
        a.Address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.id.includes(searchQuery);

      // Date range filter (based on createdAt)
      let matchesDateRange = true;
      if (fromDate || toDate) {
        const agentCreatedDate = new Date(a.createdAt);
        if (fromDate && agentCreatedDate < fromDate) {
          matchesDateRange = false;
        }
        if (toDate && agentCreatedDate > toDate) {
          matchesDateRange = false;
        }
      }

      return matchesTab && matchesSearch && matchesDateRange;
    });
  }, [agents, activeTab, searchQuery, fromDate, toDate]);

  // Calculate dynamic counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: agents.length,
      active: agents.filter((a) => a.status.toLowerCase() === "active").length,
      inactive: agents.filter((a) => a.status.toLowerCase() === "inactive")
        .length,
    };
  }, [agents]);

  const tabs = [
    { value: "all", label: "All", count: tabCounts.all },
    { value: "active", label: "Active", count: tabCounts.active },
    { value: "inactive", label: "Inactive", count: tabCounts.inactive },
  ];

  // Handle search filter changes
  const handleFiltersChange = (params: {
    query?: string;
    debouncedQuery?: string;
    fromDate?: Date | null;
    toDate?: Date | null;
  }) => {
    if (params.debouncedQuery !== undefined) {
      setSearchQuery(params.debouncedQuery);
    }
    if (params.fromDate !== undefined) {
      setFromDate(params.fromDate);
    }
    if (params.toDate !== undefined) {
      setToDate(params.toDate);
    }
  };

  // Handle endpoint change (not used for local data but required by SearchFilter)
  const handleEndpointChange = (endpoint: string) => {
    // Not used for local data filtering - just log for debugging
    console.log("Endpoint would be:", endpoint);
  };

  // Toggle expanded state for an agent
  const toggleExpanded = (agentId: string) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentId)) {
      newExpanded.delete(agentId);
    } else {
      newExpanded.add(agentId);
    }
    setExpandedAgents(newExpanded);
  };

  const handleViewAgentId = (agentId: string) => {
    setSelectedAgentId(agentId);
  };

  const handleBackFromDetails = () => {
    setSelectedAgentId(null);
  };

  // If agent details is selected, show the details component
  if (selectedAgentId) {
    return (
      <AgentDetails agentId={selectedAgentId} onBack={handleBackFromDetails} />
    );
  }
  // Create expanded data for each agent
  const getExpandedData = (a: Agent) => [
    {
      label: "Status",
      value: (
        <span
          className={cn(
            "px-2 py-1 rounded-full text-xs",
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
      label: "Phone Number",
      value: (
        <div className="text-blue-600 flex items-center gap-3">
          <span>{a.phone}</span>
          <div
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(a.phone);
                toast.success("Agent phone number copied to clipboard!");
              } catch {
                toast.error("Failed to copy Agent phone number.");
              }
            }}
            className="rounded-full p-1 bg-black cursor-pointer"
          >
            <BiSolidCopy size={10} color="white" />
          </div>
        </div>
      ),
    },
    {
      label: "Address",
      value: a.Address,
    },
    {
      label: "Last active",
      value: <DateFormatterToText date={a.lastActive} mode="datetime" />,
    },
    {
      label: "Total No. of Customers",
      value: (
        <div className="flex items-center gap-2">
          <span className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {a.tot_customer}
          </span>
          <span
            onClick={() => handleViewAgentId(a.id)}
            className="text-blue-600 underline cursor-pointer"
          >
            View all
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="w-full px-1">
        <SearchFilter
          baseEndpoint="agents"
          onEndpointChange={handleEndpointChange}
          onFiltersChange={handleFiltersChange}
          useDate={true}
          searchPlaceholder="Search agents..."
          containerClassName="w-full"
        />
      </div>

      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList className="bg-transparent p-0 flex gap-2">
          {tabs.map((tab) => {
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-all",
                  "data-[state=active]:bg-[#101928] data-[state=active]:text-white"
                )}
              >
                {tab.label}
                <div
                  className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    activeTab === tab.value
                      ? "bg-white text-[#344054]"
                      : "bg-[#D0D5DD] text-[#344054]"
                  )}
                >
                  {tab.count}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="space-y-2">
              <div className="bg-[#F9FAFB] rounded-md p-4 text-sm text-gray-600">
                Showing {filteredAgents.length} {activeTab} agents
              </div>

              {/* {filteredAgents.map((a) => { */}
              {filteredAgents.slice(0, visibleCount).map((a) => {
                const fullName = [a.firstName, a.lastName]
                  .filter(Boolean)
                  .join(" ");

                const isExpanded = expandedAgents.has(a.id);
                const expandedData = getExpandedData(a);

                return (
                  <div key={a.id} className="bg-white rounded-md border p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleExpanded(a.id)}
                    >
                      <SmartAvatar
                        data={a}
                        src={a.photo}
                        getKey={(a) => a.id}
                        getInitialsName={() => fullName}
                        getName={() => fullName}
                        showName
                        upContent={`ID: ${a.id}`}
                        upContentClassName="text-xs text-gray-500 font-mono"
                      />

                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform text-gray-500",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {expandedData.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between"
                          >
                            <span className="text-gray-600 text-sm">
                              {item.label}:
                            </span>
                            <div className="text-sm font-medium">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {visibleCount < filteredAgents.length || visibleCount > 5 ? (
                <div className="flex justify-center gap-4 mt-4">
                  {visibleCount < filteredAgents.length && (
                    <Button
                      onClick={handleLoadMore}
                      variant="outline"
                      className="text-blue-600 text-sm flex items-center justify-center gap-2"
                      disabled={isLoadingMore}
                    >
                      <span>{isLoadingMore ? "Loading..." : "Load More"}</span>
                      {isLoadingMore && <Loader1 />}
                    </Button>
                  )}

                  {visibleCount > 5 && (
                    <Button
                      onClick={handleSeeLess}
                      variant="ghost"
                      className="text-destructive text-sm"
                    >
                      See Less
                    </Button>
                  )}
                </div>
              ) : null}

              {filteredAgents.length === 0 && (
                <div className="bg-white rounded-md border p-8 text-center text-gray-500">
                  No agents found matching your criteria
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
