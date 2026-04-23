"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DashboardShell } from "@/components/aura/dashboard/dashboard-shell";
import { NodeGraph } from "@/components/aura/canvas/node-graph";
import { SenseiInspector } from "@/components/aura/dashboard/sensei-inspector";
import { ForgeChatPanel } from "@/components/aura/dashboard/forge-chat-panel";

type Tab = "info" | "chat";

const AGENT_ID = "japanese-sensei";

function InspectorTabToggle({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  return (
    <div className="flex border border-background/30 mb-2">
      {(["info", "chat"] as Tab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "flex-1 py-1.5 text-xs font-bold uppercase tracking-widest transition-colors",
            activeTab === tab
              ? "bg-background text-foreground"
              : "text-background/60 hover:text-background"
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export function ForgePageClient() {
  const [activeTab, setActiveTab] = useState<Tab>("info");

  return (
    <DashboardShell
      inspectorHeader={
        <InspectorTabToggle activeTab={activeTab} onTabChange={setActiveTab} />
      }
      inspectorNoScroll={activeTab === "chat"}
      inspector={
        activeTab === "info" ? (
          <SenseiInspector />
        ) : (
          <ForgeChatPanel agentId={AGENT_ID} />
        )
      }
    >
      <NodeGraph />
    </DashboardShell>
  );
}
