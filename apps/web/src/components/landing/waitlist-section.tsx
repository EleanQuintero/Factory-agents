'use client'

import { useState } from 'react'

export function WaitlistSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setLoading(false)
    setSubmitted(true)
  }

  return (
    <section id="waitlist" className="py-32 border-b border-border px-6 lg:px-16 text-center">
      <div className="max-w-7xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-destructive border-l-2 border-destructive pl-2 inline-block mb-8">
          [EARLY ACCESS]
        </span>

        <h2 className="text-5xl lg:text-6xl font-bold uppercase tracking-tighter leading-none text-foreground">
          THE MACHINE IS
          <br />
          YOURS TO BUILD.
        </h2>

        <p className="mt-6 mb-12 max-w-lg mx-auto text-sm text-foreground/60 leading-relaxed">
          No templates. No lock-in. Just the tools to forge your operator.
          Join the early access list.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ENTER OPERATOR ID (your email)"
              className="w-full h-12 bg-transparent border border-foreground px-4 text-sm text-foreground placeholder:text-muted-foreground uppercase tracking-wider focus:outline-none focus:border-foreground font-mono"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-foreground text-background text-sm font-bold uppercase tracking-wider border border-foreground hover:bg-background hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'PROCESSING...' : 'INITIATE FORGE'}
            </button>
          </form>
        ) : (
          <p className="text-sm uppercase tracking-widest text-foreground border border-foreground p-4 max-w-md mx-auto">
            [ACCESS QUEUED. STANDBY FOR TRANSMISSION.]
          </p>
        )}

        <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">
          [NO SPAM. NO TEMPLATES. JUST ACCESS.]
        </p>
      </div>
    </section>
  )
}
