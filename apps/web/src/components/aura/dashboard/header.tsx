import { Tag } from "@/components/aura/tag";

export function Header() {
  return (
    <header className="h-16 shrink-0 border-b border-foreground px-6 flex items-center justify-between">
      <h1 className="text-base font-bold uppercase tracking-tight">
        AURA: AI AGENT FACTORY
      </h1>
      <div className="flex items-center gap-6">
        <Tag>AGENT: SENSEI</Tag>
        <Tag>STATUS: RUNNING</Tag>
      </div>
    </header>
  );
}
