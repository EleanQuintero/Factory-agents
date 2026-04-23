import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { InspectorPanel } from "./inspector-panel";

type DashboardShellProps = {
  children: React.ReactNode;
  inspector?: React.ReactNode;
  inspectorHeader?: React.ReactNode;
  inspectorNoScroll?: boolean;
};

export function DashboardShell({ children, inspector, inspectorHeader, inspectorNoScroll }: DashboardShellProps) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">{children}</main>
        <InspectorPanel header={inspectorHeader} noScroll={inspectorNoScroll}>{inspector}</InspectorPanel>
      </div>
    </div>
  );
}
