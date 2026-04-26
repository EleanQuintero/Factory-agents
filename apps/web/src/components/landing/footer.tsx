export function Footer() {
  const navLinks = ['PROTOCOL', 'MODULES', 'DOCS', 'WAITLIST']

  return (
    <footer className="border-t border-border py-10 px-6 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
          {/* Left */}
          <div className="text-center lg:text-left">
            <span className="font-bold uppercase tracking-tight text-foreground">
              AURA
            </span>
            <br />
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              TACTICAL OPERATOR FOUNDRY
            </span>
          </div>

          {/* Center */}
          <nav className="flex flex-wrap justify-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-medium uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                {link}
              </a>
            ))}
          </nav>

          {/* Right */}
          <span className="text-xs text-muted-foreground uppercase">
            [V1.0 // © 2026]
          </span>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-border/30 text-center">
          <span className="text-xs uppercase tracking-widest text-muted-foreground/50">
            BUILT FOR BUILDERS. NOT CONSUMERS.
          </span>
        </div>
      </div>
    </footer>
  )
}
