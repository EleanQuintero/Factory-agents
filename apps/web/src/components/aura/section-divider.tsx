import { cn } from "@/lib/utils";

type SectionDividerProps = {
  inverted?: boolean;
  className?: string;
};

export function SectionDivider({ inverted = false, className }: SectionDividerProps) {
  return (
    <hr
      className={cn(
        "border-0 border-t",
        inverted ? "border-background" : "border-foreground",
        className,
      )}
    />
  );
}
