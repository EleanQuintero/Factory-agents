'use client'

import { scrollToId } from '@/lib/scroll'

export function Navbar() {
  const navLinks = ['PROTOCOL', 'MODULES', 'DOCS']

  return (
    <nav className="h-16 border-b border-border px-6 sticky top-0 bg-background z-50 flex items-center justify-between">
      <div className="flex items-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="flex-shrink-0 text-foreground"
        >
          <polygon points="16,4 28,10 16,16 4,10" />
          <polygon points="4,10 16,16 16,28 4,22" />
          <polygon points="16,16 28,10 28,22 16,28" />
        </svg>
        <span className="text-base font-bold uppercase tracking-tight ml-3 text-foreground">
          AURA
        </span>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <button
              key={link}
              onClick={() => scrollToId(link.toLowerCase())}
              className="text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollToId('waitlist')}
          className="bg-foreground text-background h-10 px-6 text-xs font-bold uppercase tracking-wider border border-foreground hover:bg-background hover:text-foreground transition-colors"
        >
          ENTER WORKSTATION
        </button>
      </div>
    </nav>
  )
}
