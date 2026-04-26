import { Grid2X2, Network, Slash, Terminal } from 'lucide-react'

const features = [
  {
    num: '01',
    icon: Grid2X2,
    title: 'MODULAR NODES',
    body: 'Compose agents from discrete, swappable capability modules. Each node is inspectable, configurable, replaceable.',
  },
  {
    num: '02',
    icon: Network,
    title: 'TACTICAL CANVAS',
    body: 'Visual composition on an industrial-grade graph. Connect data flows. Map memory. Own the wiring.',
  },
  {
    num: '03',
    icon: Slash,
    title: 'ZERO TEMPLATES',
    body: 'No pre-built personas. No locked behaviors. Every operator assembled from first principles to your spec.',
  },
  {
    num: '04',
    icon: Terminal,
    title: 'LIVE DEPLOYMENT',
    body: 'Ship agents from canvas to production in one motion. Monitor telemetry in the terminal. Iterate without ceremony.',
  },
]

export function CapabilitiesSection() {
  return (
    <section id="modules" className="py-24 border-b border-border px-6 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            [§01 — CAPABILITIES]
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tighter mt-4 text-foreground">
            AN OPERATOR BUILT FOR YOUR MISSION.
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-muted-foreground">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.num}
                className="bg-background p-8 flex flex-col gap-4 group cursor-default border-l-2 border-transparent hover:border-foreground transition-colors"
              >
                <Icon size={20} strokeWidth={1.5} className="text-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  {feature.num}
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mt-2">
                  {feature.title}
                </h3>
                <p className="text-xs text-foreground/60 leading-relaxed mt-1">
                  {feature.body}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
