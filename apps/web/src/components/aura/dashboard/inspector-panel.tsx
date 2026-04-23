import { cn } from "@/lib/utils";

type InspectorPanelProps = {
  children?: React.ReactNode;
  header?: React.ReactNode;
  /** When true, the content area won't scroll — useful when children manage their own overflow */
  noScroll?: boolean;
  className?: string;
};

export function InspectorPanel({ children, header, noScroll, className }: InspectorPanelProps) {
  return (
    <aside
      className={cn(
        "w-80 shrink-0 bg-foreground text-background flex flex-col overflow-hidden",
        className,
      )}
    >
      {header && (
        <div className="shrink-0 px-6 pt-6">
          {header}
        </div>
      )}
      <div
        className={cn(
          "flex-1 p-6 flex flex-col gap-6 min-h-0",
          noScroll ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {children}
      </div>
    </aside>
  );
}
