import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function Playground() {
  return (
    <div className="min-h-screen bg-background text-foreground p-10 flex flex-col gap-10">
      <header>
        <h1 className="text-lg font-bold uppercase tracking-tight">
          AURA / PLAYGROUND
        </h1>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          [PHASE 2 — SHADCN PRIMITIVES]
        </p>
      </header>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Button variants — on dark canvas
        </h2>
        <div className="flex flex-col gap-2 max-w-xs">
          <Button variant="default" size="lg" className="uppercase tracking-wider">
            Integrate Module
          </Button>
          <Button variant="outline" size="lg" className="uppercase tracking-wider">
            Customize
          </Button>
          <Button variant="destructive" size="lg" className="uppercase tracking-wider">
            Terminate Configuration
          </Button>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Button variants — on beige panel (inverted)
        </h2>
        <div className="bg-foreground text-background p-6 flex flex-col gap-2 max-w-xs">
          <Button variant="default" size="lg" className="uppercase tracking-wider">
            Integrate Module
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="uppercase tracking-wider bg-transparent border-background text-background hover:bg-background hover:text-foreground"
          >
            Customize
          </Button>
          <Button variant="destructive" size="lg" className="uppercase tracking-wider">
            Terminate Configuration
          </Button>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider">
          Progress — raw primitive (will be restyled in Phase 3)
        </h2>
        <div className="flex flex-col gap-2 max-w-sm">
          <Progress value={78} />
          <Progress value={92} />
          <Progress value={64} />
        </div>
      </section>
    </div>
  );
}
