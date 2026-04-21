import { DashboardShell } from "@/components/aura/dashboard/dashboard-shell";
import { NodeGraph } from "@/components/aura/canvas/node-graph";
import { SenseiInspector } from "@/components/aura/dashboard/sensei-inspector";

export default function ForgePage() {
  return (
    <DashboardShell inspector={<SenseiInspector />}>
      <NodeGraph />
    </DashboardShell>
  );
}
