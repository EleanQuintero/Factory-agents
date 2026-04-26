const phases = [
  {
    n: '01',
    title: 'COMPOSE',
    body: 'Drag capability nodes onto the workstation. Wire inputs, outputs, memory bindings. No ceremony, no boilerplate.',
  },
  {
    n: '02',
    title: 'CALIBRATE',
    body: 'Tune every parameter. Inspect every signal. No black boxes — every wire is traceable, every value is mutable.',
  },
  {
    n: '03',
    title: 'DEPLOY',
    body: 'Compile to a production-grade operator. Ship to the edge. Monitor telemetry live. Revise without downtime.',
  },
]

export function ProtocolSection() {
  return (
    <section id="protocol" className="py-24 border-b border-border px-6 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            [§02 — ASSEMBLY PROTOCOL]
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold uppercase tracking-tighter mt-4 text-foreground">
            THREE PHASES. ONE OPERATOR.
          </h2>
        </div>

        {/* Three-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {phases.map((phase) => (
            <div
              key={phase.n}
              className="px-0 lg:px-12 py-8 flex flex-col gap-4 relative first:pl-0 last:pr-0"
            >
              {/* Watermark number */}
              <span className="absolute top-6 right-6 text-8xl font-bold text-muted-foreground/20 select-none leading-none">
                {phase.n}
              </span>

              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                PHASE {phase.n}
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-tight mt-2 text-foreground">
                {phase.title}
              </h3>
              <div className="w-8 h-px bg-foreground my-2" />
              <p className="text-sm text-foreground/60 leading-relaxed">
                {phase.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
