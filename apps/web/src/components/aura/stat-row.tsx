import { cn } from "@/lib/utils";

type StatRowProps = {
  label: string;
  value: string;
  percent: number;
  inverted?: boolean;
  className?: string;
};

export function StatRow({
  label,
  value,
  percent,
  inverted = true,
  className,
}: StatRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
        <span className="text-sm font-bold">{value}</span>
      </div>
      <div
        className={cn(
          "h-2 w-full",
          inverted ? "bg-background/20" : "bg-muted/30",
        )}
      >
        <div
          className={cn(
            "h-full transition-[width] duration-300",
            inverted ? "bg-background" : "bg-foreground",
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
