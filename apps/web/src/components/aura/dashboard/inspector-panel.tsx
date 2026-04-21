import { cn } from "@/lib/utils";

type InspectorPanelProps = {
  children?: React.ReactNode;
  className?: string;
};

export function InspectorPanel({ children, className }: InspectorPanelProps) {
  return (
    <aside
      className={cn(
        "w-80 shrink-0 bg-foreground text-background p-6 flex flex-col gap-6 overflow-y-auto",
        className,
      )}
    >
      {children}
    </aside>
  );
}
