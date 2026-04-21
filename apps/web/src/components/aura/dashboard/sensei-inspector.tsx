import { Button } from "@/components/ui/button";
import { Tag } from "@/components/aura/tag";
import { SectionDivider } from "@/components/aura/section-divider";
import { StatRow } from "@/components/aura/stat-row";

type SubAgent = {
  letter: string;
  name: string;
  role: string;
};

const SUB_AGENTS: SubAgent[] = [
  { letter: "W", name: "WEB SEARCH", role: "Lookup / context" },
  { letter: "N", name: "NOTION", role: "Lesson notes persist" },
  { letter: "R", name: "RESEND", role: "Weekly summary email" },
];

function SubAgentRow({ agent, isLast }: { agent: SubAgent; isLast: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 ${
        isLast ? "" : "border-b border-background/20"
      }`}
    >
      <div className="size-8 shrink-0 bg-background text-foreground flex items-center justify-center text-sm font-bold">
        {agent.letter}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold uppercase tracking-wider">
          {agent.name}
        </span>
        <span className="text-xs text-background/70">{agent.role}</span>
      </div>
    </div>
  );
}

export function SenseiInspector() {
  return (
    <>
      <section className="flex flex-col gap-2">
        <Tag className="text-background/70">SELECTED: ORCHESTRATOR</Tag>
        <h2 className="text-lg font-bold uppercase tracking-tight">
          SENSEI / JP TUTOR
        </h2>
        <p className="text-xs text-background/80">
          Adaptive Japanese instruction agent. 3 sub-agents wired.
        </p>
      </section>

      <section className="border border-background">
        {SUB_AGENTS.map((agent, i) => (
          <SubAgentRow
            key={agent.letter}
            agent={agent}
            isLast={i === SUB_AGENTS.length - 1}
          />
        ))}
      </section>

      <SectionDivider inverted />

      <section className="flex flex-col gap-5">
        <StatRow label="FLUENCY LEVEL" value="N3 · 78%" percent={78} />
        <StatRow label="MEMORY CONTEXT" value="92%" percent={92} />
        <StatRow label="RESPONSE LATENCY" value="0.64s" percent={64} />
      </section>

      <SectionDivider inverted />

      <section className="flex flex-col gap-2">
        <Button
          variant="default"
          size="lg"
          className="w-full uppercase tracking-wider"
        >
          Add Sub-Agent
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="w-full uppercase tracking-wider bg-transparent border-background text-background hover:bg-background hover:text-foreground"
        >
          Customize Prompt
        </Button>
        <Button
          variant="destructive"
          size="lg"
          className="w-full uppercase tracking-wider"
        >
          Terminate Agent
        </Button>
      </section>
    </>
  );
}
