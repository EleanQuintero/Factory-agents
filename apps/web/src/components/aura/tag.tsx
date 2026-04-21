import { cn } from "@/lib/utils";

type TagProps = {
  children: React.ReactNode;
  className?: string;
};

export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "text-xs uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      [{children}]
    </span>
  );
}
