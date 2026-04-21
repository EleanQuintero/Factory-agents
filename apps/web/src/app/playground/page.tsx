import { Button } from "@/components/ui/button";
import { AuraNode } from "@/components/aura/aura-node";
import { StatRow } from "@/components/aura/stat-row";
import { Tag } from "@/components/aura/tag";
import { SectionDivider } from "@/components/aura/section-divider";
import { ChevronRight, ChevronLeft, Search, Target } from "lucide-react";

export default function Playground() {
  return (
    <div className="min-h-screen bg-background text-foreground p-10 flex flex-col gap-10">
      <header>
        <h1 className="text-lg font-bold uppercase tracking-tight">
          AURA / PLAYGROUND
        </h1>
        <Tag>PHASE 3 — AURA PRIMITIVES</Tag>
      </header>

      <SectionDivider />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Tag primitive
        </h2>
        <div className="flex gap-4">
          <Tag>ORCHESTRATOR</Tag>
          <Tag>SUB-AGENT</Tag>
          <Tag>STATUS: READY</Tag>
          <Tag>V1.0 // TACTICAL-GRADE</Tag>
        </div>
      </section>

      <SectionDivider />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          AuraNode — all sizes + inverted variant
        </h2>
        <div className="flex items-center gap-8 flex-wrap">
          <AuraNode
            size="sm"
            icon={<ChevronRight />}
            label="PROMPT"
            sub="INPUT"
          />
          <AuraNode
            size="sm"
            icon={<ChevronLeft />}
            label="RESPONSE"
            sub="OUTPUT"
          />
          <AuraNode
            size="md"
            icon={<Search />}
            label="WEB SEARCH"
            sub="SUB-AGENT"
          />
          <AuraNode
            size="md"
            icon={<span className="text-2xl font-bold">N</span>}
            label="NOTION"
            sub="SUB-AGENT"
          />
          <AuraNode
            size="lg"
            inverted
            icon={<Target />}
            label="SENSEI"
            sub="ORCHESTRATOR"
          />
        </div>
      </section>

      <SectionDivider />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          StatRow — on inverted panel (Inspector context)
        </h2>
        <div className="bg-foreground text-background p-6 flex flex-col gap-5 max-w-sm">
          <StatRow label="FLUENCY LEVEL" value="N3 · 78%" percent={78} />
          <StatRow label="MEMORY CONTEXT" value="92%" percent={92} />
          <StatRow label="RESPONSE LATENCY" value="0.64s" percent={64} />
        </div>
      </section>

      <SectionDivider />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          StatRow — on dark canvas (default)
        </h2>
        <div className="flex flex-col gap-5 max-w-sm">
          <StatRow
            label="FLUENCY LEVEL"
            value="N3 · 78%"
            percent={78}
            inverted={false}
          />
          <StatRow
            label="MEMORY CONTEXT"
            value="92%"
            percent={92}
            inverted={false}
          />
        </div>
      </section>

      <SectionDivider />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Button variants — quick re-check
        </h2>
        <div className="flex flex-col gap-2 max-w-xs">
          <Button
            variant="default"
            size="lg"
            className="uppercase tracking-wider"
          >
            Integrate Module
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="uppercase tracking-wider"
          >
            Customize
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="uppercase tracking-wider"
          >
            Terminate Configuration
          </Button>
        </div>
      </section>
    </div>
  );
}
