"use client";

import { useRouter } from "next/navigation";

const plans = [
  {
    key: "starter",
    name: "Starter",
    account: 3000,
    fee: 1000,
  },
  {
    key: "basic",
    name: "Basic",
    account: 5000,
    fee: 1200,
  },
  {
    key: "growth",
    name: "Growth",
    account: 8000,
    fee: 1440,
  },
  {
    key: "pro",
    name: "Pro",
    account: 10000,
    fee: 1730,
  },
  {
    key: "advanced",
    name: "Advanced",
    account: 20000,
    fee: 2080,
    bestValue: true,
  },
  {
    key: "elite",
    name: "Elite",
    account: 25000,
    fee: 2490,
  },
];

export default function ChallengesPage() {
  const router = useRouter();

  const selectPlan = (planKey: string) => {
    router.push(`/checkout?plan=${planKey}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">

      <div className="mx-auto max-w-6xl">

        {/* TOP BUTTON */}

        <div className="mb-6">
          <button
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            ← Back to Home
          </button>
        </div>

        {/* HEADER */}

        <div className="mb-10 text-center">

          <p className="text-sm font-semibold text-slate-400">
            TradeNova
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Choose Your Challenge
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Select a simulated trading account
            and start your TradeNova challenge.
          </p>

        </div>

        {/* PLANS */}

        <div
          id="plans-section"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >

          {plans.map((plan) => (

            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-slate-900 p-6 ${
                plan.bestValue
                  ? "border-green-500/50"
                  : "border-slate-800"
              }`}
            >

              {/* BEST VALUE */}

              {plan.bestValue && (
                <div className="absolute right-4 top-4 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                  BEST VALUE
                </div>
              )}

              <p className="text-sm text-slate-400">
                {plan.name}
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                ₹
                {plan.account.toLocaleString(
                  "en-IN"
                )}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Simulated account
              </p>

              {/* FEE */}

              <div className="mt-6 rounded-xl bg-slate-950 p-4">

                <p className="text-xs text-slate-500">
                  Challenge Fee
                </p>

                <p className="mt-1 text-2xl font-bold">
                  ₹
                  {plan.fee.toLocaleString(
                    "en-IN"
                  )}
                </p>

              </div>

              {/* RULES */}

              <div className="mt-6 space-y-3 text-sm">

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Profit Target
                  </span>
                  <span className="font-semibold">
                    8%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Daily Drawdown
                  </span>
                  <span className="font-semibold">
                    5%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Maximum Drawdown
                  </span>
                  <span className="font-semibold">
                    10%
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Minimum Trading Days
                  </span>
                  <span className="font-semibold">
                    5
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Leverage
                  </span>
                  <span className="font-semibold">
                    5×
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">
                    Overnight
                  </span>
                  <span className="font-semibold">
                    Allowed
                  </span>
                </div>

              </div>

              {/* BUTTON */}

              <button
                onClick={() =>
                  selectPlan(plan.key)
                }
                className="mt-7 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-slate-200"
              >
                Choose {plan.name}
              </button>

            </div>

          ))}

        </div>

        <div className="py-10 text-center text-xs text-slate-600">
          TradeNova simulated trading environment
        </div>

      </div>

    </main>
  );
}