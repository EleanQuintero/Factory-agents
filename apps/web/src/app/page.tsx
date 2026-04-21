import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start">
        <section>
          <h1 className="text-2xl font-bold uppercase tracking-tight">
            AURA: AI AGENT FACTORY
          </h1>
          <p className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
            [STATUS: READY]
          </p>
        </section>
        <section className="flex flex-col gap-2 text-sm uppercase tracking-wider">
          <Link href="/chat" className="border-b border-foreground pb-1">
            Chat with Agent
          </Link>
        </section>
      </main>
    </div>
  );
}
