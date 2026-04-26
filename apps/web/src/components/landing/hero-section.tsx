'use client'

import { scrollToId } from '@/lib/scroll'

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center border-b border-foreground px-6 lg:px-16">
      <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto">
        {/* Left Content */}
        <div className="flex-1 flex flex-col gap-6 justify-center py-16 lg:py-0">
          <span className="text-xs uppercase tracking-widest text-muted-foreground border-l-2 border-muted-foreground pl-3">
            [V1.0 // TACTICAL-GRADE]
          </span>

          <h1
            className="text-5xl lg:text-7xl font-bold uppercase leading-none tracking-tighter text-foreground animate-fade-up"
            style={{ animationDelay: '100ms' }}
          >
            FORGE AGENTS.
            <br />
            NOT TEMPLATES.
          </h1>

          <p
            className="text-sm text-foreground/70 leading-relaxed max-w-md animate-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            AURA is a tactical-grade operator foundry. Compose, calibrate, and deploy
            AI agents from first principles. No templates. No black boxes. Just
            industrial-strength tools for builders who demand full control.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <button
              onClick={() => scrollToId('waitlist')}
              className="bg-foreground text-background h-12 px-8 text-sm font-bold uppercase tracking-wider border border-foreground hover:bg-background hover:text-foreground transition-colors"
            >
              INITIATE FORGE
            </button>
            <button
              onClick={() => scrollToId('protocol')}
              className="bg-transparent text-foreground h-12 px-8 border border-foreground text-sm font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors"
            >
              VIEW PROTOCOL
            </button>
          </div>

          <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground animate-fade-up" style={{ animationDelay: '400ms' }}>
            <span className="w-1 h-4 bg-destructive inline-block" />
            [STATUS: ACCEPTING EARLY ACCESS]
          </span>
        </div>

        {/* Right Content - Cube Visual */}
        <div className="flex-1 flex items-center justify-center py-16 lg:py-0">
          <div className="w-80 h-80 relative flex flex-col items-center justify-center">
            {/* Background radial gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(241,230,212,0.04) 0%, transparent 70%)'
              }}
            />

            {/* Isometric Cube */}
            <div className="animate-float relative">
              <svg
                width="220"
                height="240"
                viewBox="0 0 220 240"
                fill="none"
                className="relative z-10"
              >
                {/* Top face */}
                <polygon
                  points="110,20 200,70 110,120 20,70"
                  fill="#1a1d20"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  className="text-foreground"
                />
                {/* Top face A glyph */}
                <path
                  d="M 90,60 L 110,45 L 130,60 M 95,55 L 110,70 L 125,55"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-foreground"
                />

                {/* Left face */}
                <polygon
                  points="20,70 110,120 110,220 20,170"
                  fill="#1a1d20"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  className="text-foreground"
                />
                {/* Left face A glyph */}
                <path
                  d="M 50,120 L 65,105 L 80,120 M 52,115 L 65,135 L 78,115"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-foreground"
                />

                {/* Right face */}
                <polygon
                  points="110,120 200,70 200,170 110,220"
                  fill="#1a1d20"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.3"
                  className="text-foreground"
                />
                {/* Right face A glyph */}
                <path
                  d="M 140,120 L 155,105 L 170,120 M 142,115 L 155,135 L 168,115"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-foreground"
                />
              </svg>
            </div>

            {/* AURA text below cube */}
            <span className="text-2xl font-bold uppercase tracking-[0.4em] text-foreground text-center mt-6 relative z-10">
              AURA
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
