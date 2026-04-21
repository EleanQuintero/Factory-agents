import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { InspectorPanel } from "./inspector-panel";

type DashboardShellProps = {
  children: React.ReactNode;
  inspector?: React.ReactNode;
};

export function DashboardShell({ children, inspector }: DashboardShellProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
        <InspectorPanel>{inspector}</InspectorPanel>
      </div>
    </div>
  );
}
