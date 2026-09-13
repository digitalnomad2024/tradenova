export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-bold">
            Trade<span className="text-cyan-400">Nova</span>
          </div>

          <div className="flex items-center gap-4">
            <button className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:text-white">
              Login
            </button>

            <button className="rounded-lg bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            🚀 The next generation trading platform
          </div>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Trade with confidence.
            <span className="block text-cyan-400">
              Grow with TradeNova.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            TradeNova is built for traders who want powerful tools,
            transparent rules, and a simple way to take their trading
            journey to the next level.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <button className="rounded-xl bg-cyan-400 px-7 py-4 font-semibold text-slate-950 hover:bg-cyan-300">
              Start Trading
            </button>

            <button className="rounded-xl border border-white/10 bg-white/5 px-7 py-4 font-semibold hover:bg-white/10">
              Explore Challenges
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-8 text-center">
            <div className="text-3xl font-bold">$1M+</div>
            <div className="mt-2 text-sm text-slate-400">
              Target buying power
            </div>
          </div>

          <div className="p-8 text-center">
            <div className="text-3xl font-bold">24/7</div>
            <div className="mt-2 text-sm text-slate-400">
              Platform access
            </div>
          </div>

          <div className="p-8 text-center">
            <div className="text-3xl font-bold">Fast</div>
            <div className="mt-2 text-sm text-slate-400">
              Evaluation process
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Why TradeNova
          </p>

          <h2 className="mt-3 text-4xl font-bold">
            Everything traders need.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            title="Simple Challenges"
            description="Clear trading rules designed to make the evaluation process easy to understand."
            icon="⚡"
          />

          <Feature
            title="Powerful Dashboard"
            description="Track your account, performance, risk and progress from one place."
            icon="📊"
          />

          <Feature
            title="Trader First"
            description="Built around transparency, performance and a better trader experience."
            icon="🛡️"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-10 text-center md:p-16">
          <h2 className="text-4xl font-bold">
            Ready to trade bigger?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Choose your challenge and start building your trading career
            with TradeNova.
          </p>

          <button className="mt-8 rounded-xl bg-cyan-400 px-8 py-4 font-semibold text-slate-950 hover:bg-cyan-300">
            View Challenges
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © 2026 TradeNova. All rights reserved.
      </footer>
    </main>
  );
}

function Feature({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 transition hover:border-cyan-400/30">
      <div className="text-3xl">{icon}</div>

      <h3 className="mt-6 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {description}
      </p>
    </div>
  );
}