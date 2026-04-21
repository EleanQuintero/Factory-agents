import { DashboardShell } from "@/components/aura/dashboard/dashboard-shell";
import { Tag } from "@/components/aura/tag";

export default function ForgePage() {
  return (
    <DashboardShell
      inspector={
        <div className="flex flex-col gap-2">
          <Tag>INSPECTOR</Tag>
          <p className="text-xs">
            Empty for Phase 4 — will be populated in Phase 6.
          </p>
        </div>
      }
    >
      <div className="h-full w-full flex items-center justify-center">
        <Tag>CANVAS PLACEHOLDER — PHASE 5</Tag>
      </div>
    </DashboardShell>
  );
}
