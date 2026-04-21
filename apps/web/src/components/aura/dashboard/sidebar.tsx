import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  active?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "AGENT FORGE", href: "/forge", active: true },
  { label: "MODEL LIBRARY", href: "#" },
  { label: "TASKS", href: "#" },
  { label: "SETTINGS", href: "#" },
];

export function Sidebar() {
  return (
    <aside className="w-60 shrink-0 border-r border-foreground pt-6 flex flex-col">
      {NAV_ITEMS.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className={cn(
            "px-6 py-4 text-sm font-medium uppercase tracking-wider border-l-[3px]",
            item.active
              ? "border-foreground text-foreground"
              : "border-transparent text-foreground/80 hover:text-foreground",
          )}
        >
          {item.label}
        </a>
      ))}
    </aside>
  );
}
