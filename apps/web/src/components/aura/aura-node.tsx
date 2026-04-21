import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Tag } from "./tag";

const nodeVariants = cva(
  "flex flex-col items-center justify-center gap-2 border border-foreground rounded-sm p-3 select-none",
  {
    variants: {
      size: {
        sm: "size-[110px]",
        md: "size-[140px]",
        lg: "size-[200px]",
      },
      inverted: {
        true: "bg-foreground text-background border-foreground",
        false: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      size: "md",
      inverted: false,
    },
  },
);

type AuraNodeProps = VariantProps<typeof nodeVariants> & {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  className?: string;
};

export function AuraNode({
  icon,
  label,
  sub,
  size,
  inverted,
  className,
}: AuraNodeProps) {
  return (
    <div className={cn(nodeVariants({ size, inverted }), className)}>
      <div className="flex items-center justify-center [&_svg]:size-8 [&_svg]:stroke-[1.5]">
        {icon}
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
        {sub && (
          <Tag
            className={cn(
              inverted ? "text-background/60" : "text-muted-foreground",
            )}
          >
            {sub}
          </Tag>
        )}
      </div>
    </div>
  );
}
