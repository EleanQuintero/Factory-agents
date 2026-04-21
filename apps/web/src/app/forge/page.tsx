import { DashboardShell } from "@/components/aura/dashboard/dashboard-shell";
import { NodeGraph } from "@/components/aura/canvas/node-graph";
import { Tag } from "@/components/aura/tag";

export default function ForgePage() {
  return (
    <DashboardShell
      inspector={
        <div className="flex flex-col gap-2">
          <Tag>INSPECTOR</Tag>
          <p className="text-xs">
            Empty for Phase 5 — will be populated in Phase 6.
          </p>
        </div>
      }
    >
      <NodeGraph />
    </DashboardShell>
  );
}
