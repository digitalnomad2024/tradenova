"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";

const plans: Record<string, { name: string; account: number; fee: number; features: string[] }> = {
  starter: { name: "Starter", account: 3000, fee: 1000, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
  basic: { name: "Basic", account: 5000, fee: 1200, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
  growth: { name: "Growth", account: 8000, fee: 1440, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
  pro: { name: "Pro", account: 10000, fee: 1730, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
  advanced: { name: "Advanced", account: 20000, fee: 2080, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
  elite: { name: "Elite", account: 25000, fee: 2490, features: ["8% profit target", "5% daily drawdown", "10% max drawdown", "5 min trading days"] },
};

const MARKETS = [
  { symbol: "btcusdt", label: "BTC/USDT", name: "Bitcoin" },
  { symbol: "ethusdt", label: "ETH/USDT", name: "Ethereum" },
  { symbol: "solusdt", label: "SOL/USDT", name: "Solana" },
  { symbol: "bnbusdt", label: "BNB/USDT", name: "BNB" },
  { symbol: "xrpusdt", label: "XRP/USDT", name: "XRP" },
  { symbol: "dogeusdt", label: "DOGE/USDT", name: "Dogecoin" },
];

const PLAN_KEYS = Object.keys(plans);
const STORAGE_KEY = "tradenova-current-plan";

function tierIndex(key: string) {
  return PLAN_KEYS.indexOf(key);
}
function discountPct(key: string) {
  return (tierIndex(key) + 1) * 5;
}
function upgradePrice(key: string) {
  const fee = plans[key]?.fee ?? 0;
  return Math.round(fee * (1 - discountPct(key) / 100));
}

// ✅ Only accept a value if it's a real plan key
function getValidPlanFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return PLAN_KEYS.includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

function MarketTicker({
  symbol,
  label,
  onClick,
  active,
}: {
  symbol: string;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  const [price, setPrice] = useState<number | null>(null);
  const [change, setChange] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    const connect = () => {
      if (cancelled) return;
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@ticker`);
      ws.onmessage = (ev) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data);
          const last = parseFloat(msg.c);
          const pct = parseFloat(msg.P);
          if (!isNaN(last)) setPrice(last);
          if (!isNaN(pct)) setChange(pct);
        } catch {}
      };
      ws.onclose = () => { if (!cancelled) setTimeout(connect, 3000); };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      cancelled = true;
      if (ws) {
        ws.onclose = null; ws.onerror = null; ws.onmessage = null;
        ws.close();
      }
    };
  }, [symbol]);

  return (
    <button
      onClick={onClick}
      className={`min-w-[150px] rounded-xl border p-3 text-left transition ${
        active ? "border-cyan-400/60 bg-cyan-400/5" : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">
        {price !== null ? `$${price.toLocaleString()}` : "—"}
      </p>
      <p className={`text-xs font-semibold ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
        {change >= 0 ? "+" : ""}{change.toFixed(2)}%
      </p>
    </button>
  );
}

function LockedScreen() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl">
          🔒
        </div>
        <h1 className="mt-6 text-3xl font-bold text-red-400">Dashboard Locked</h1>
        <p className="mt-3 text-slate-300">
          You haven&apos;t purchased a challenge plan yet.
          Please choose a plan to unlock your dashboard.
        </p>
        <button
          onClick={() => router.push("/challenge")}
          className="mt-8 w-full rounded-xl bg-cyan-400 p-4 font-bold text-slate-950 transition hover:bg-cyan-300"
        >
          Choose a Plan →
        </button>
        <button
          onClick={() => router.push("/")}
          className="mt-3 w-full rounded-xl bg-white/10 p-4 font-bold transition hover:bg-white/20"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}

function DashboardContent() {
  const router = useRouter();

  // Status: "loading" | "locked" | "unlocked"
  const [status, setStatus] = useState<"loading" | "locked" | "unlocked">("loading");
  const [currentPlanKey, setCurrentPlanKey] = useState<string>("starter");

  // ✅ Check localStorage on mount
  useEffect(() => {
    const valid = getValidPlanFromStorage();
    if (valid) {
      setCurrentPlanKey(valid);
      setStatus("unlocked");
    } else {
      setStatus("locked");
    }
  }, []);

  const plan = plans[currentPlanKey] || plans.starter;
  const [activeSymbol, setActiveSymbol] = useState(MARKETS[0].symbol);
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const profitTarget = plan.account * 0.08;
  const dailyDrawdownLimit = plan.account * 0.05;
  const maxDrawdownLimit = plan.account * 0.1;

  const stats = {
    balance: plan.account,
    equity: plan.account,
    totalPnL: 0,
    closedTrades: 0,
    openPositions: 0,
    winRate: 0,
  };

  const progression =
    stats.totalPnL >= profitTarget && stats.closedTrades >= 5
      ? "PASSED"
      : stats.totalPnL < 0 && Math.abs(stats.totalPnL) >= dailyDrawdownLimit
      ? "FAILED"
      : "ACTIVE";

  const progressPct = Math.min(100, Math.max(0, (stats.totalPnL / profitTarget) * 100));

  const handleUpgrade = (key: string) => {
    const price = upgradePrice(key);
    const disc = discountPct(key);
    const ok = confirm(
      `Upgrade to ${plans[key].name}?\n\nFee: ₹${plans[key].fee.toLocaleString("en-IN")}\nDiscount: ${disc}%\nYou pay: ₹${price.toLocaleString("en-IN")}`
    );
    if (!ok) return;
    setUpgradingTo(key);
    setTimeout(() => {
      setCurrentPlanKey(key);
      localStorage.setItem(STORAGE_KEY, key);
      setUpgradingTo(null);
      setNotice(`🎉 Upgraded to ${plans[key].name}. You paid ₹${price.toLocaleString("en-IN")} (${disc}% off).`);
      setTimeout(() => setNotice(null), 4000);
    }, 900);
  };

  // ─── GUARDS ────────────────────────────────────────
  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading...
      </main>
    );
  }

  if (status === "locked") {
    return <LockedScreen />;
  }

  // ─── UNLOCKED DASHBOARD ────────────────────────────
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            Trade<span className="text-cyan-400">Nova</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 md:block">
              {plan.name} Challenge
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                progression === "ACTIVE"
                  ? "bg-cyan-400/10 text-cyan-400"
                  : progression === "PASSED"
                  ? "bg-green-400/10 text-green-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {progression}
            </span>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {notice && (
          <div className="mb-4 rounded-xl border border-green-400/30 bg-green-400/10 px-4 py-3 text-sm text-green-300">
            {notice}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">
              Welcome back — here&apos;s your {plan.name} challenge overview.
            </p>
          </div>
          <Link
            href={`/trade?plan=${currentPlanKey}`}
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
          >
            Start Trading →
          </Link>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Account Balance</p>
            <p className="mt-1 text-lg font-bold">₹{stats.balance.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Equity</p>
            <p className="mt-1 text-lg font-bold">₹{stats.equity.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Total P&L</p>
            <p className={`mt-1 text-lg font-bold ${stats.totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
              {stats.totalPnL >= 0 ? "+" : "-"}₹{Math.abs(stats.totalPnL).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-slate-500">Open Positions</p>
            <p className="mt-1 text-lg font-bold">{stats.openPositions}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Challenge Progress</h3>
                <span className="text-xs text-slate-500">{stats.closedTrades} / 5 min trades</span>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Profit Target</span>
                  <span className="font-semibold">
                    ₹{Math.max(0, stats.totalPnL).toLocaleString("en-IN")} / ₹{profitTarget.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400 transition-all" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Daily Drawdown Limit</p>
                  <p className="mt-1 text-sm font-bold text-red-400">₹{dailyDrawdownLimit.toLocaleString("en-IN")}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900 p-3">
                  <p className="text-xs text-slate-500">Max Drawdown Limit</p>
                  <p className="mt-1 text-sm font-bold text-red-400">₹{maxDrawdownLimit.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Market Watch</h3>
                <Link href={`/trade?plan=${currentPlanKey}`} className="text-xs text-cyan-400 hover:text-cyan-300">
                  Open Terminal →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {MARKETS.map((m) => (
                  <MarketTicker
                    key={m.symbol}
                    symbol={m.symbol}
                    label={m.label}
                    active={activeSymbol === m.symbol}
                    onClick={() => setActiveSymbol(m.symbol)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold">Recent Activity</h3>
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                No recent activity. Place your first demo trade to get started.
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold">Your Plan</h3>
              <div className="mt-4 rounded-xl bg-slate-900 p-4">
                <p className="text-xs text-slate-500">Current</p>
                <p className="mt-1 text-xl font-bold text-cyan-400">{plan.name}</p>
                <p className="mt-3 text-sm">Account Size: <span className="font-semibold">₹{plan.account.toLocaleString("en-IN")}</span></p>
                <p className="text-sm">One-time Fee: <span className="font-semibold">₹{plan.fee.toLocaleString("en-IN")}</span></p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/trade?plan=${currentPlanKey}`}
                className="mt-5 block w-full rounded-xl bg-cyan-400 py-3 text-center font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                Enter Trading Terminal
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-bold">Upgrade Plan</h3>
              <p className="mt-1 text-xs text-slate-500">
                Higher tiers unlock bigger accounts. Discount scales with tier — 5% per step.
              </p>
              <div className="mt-4 space-y-2">
                {Object.entries(plans).map(([key, p]) => {
                  const isCurrent = key === currentPlanKey;
                  const isHigher = tierIndex(key) > tierIndex(currentPlanKey);
                  const isLower = tierIndex(key) < tierIndex(currentPlanKey);
                  const disc = discountPct(key);
                  const price = upgradePrice(key);
                  const busy = upgradingTo === key;

                  return (
                    <div
                      key={key}
                      className={`rounded-xl border p-3 text-sm transition ${
                        isCurrent ? "border-cyan-400/60 bg-cyan-400/5"
                        : isHigher ? "border-white/10 bg-slate-900"
                        : "border-white/5 bg-slate-900/40 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          <p className="text-xs text-slate-500">₹{p.account.toLocaleString("en-IN")} account</p>
                        </div>
                        {isCurrent ? (
                          <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-xs font-bold text-cyan-300">Current</span>
                        ) : isHigher ? (
                          <span className="rounded-full bg-green-400/10 px-2 py-0.5 text-xs font-bold text-green-400">{disc}% OFF</span>
                        ) : (
                          <span className="text-xs text-slate-600">Locked</span>
                        )}
                      </div>

                      {isHigher && (
                        <div className="mt-3">
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="text-slate-500 line-through">₹{p.fee.toLocaleString("en-IN")}</span>
                            <span className="text-base font-bold text-white">₹{price.toLocaleString("en-IN")}</span>
                            <span className="text-green-400">save ₹{(p.fee - price).toLocaleString("en-IN")}</span>
                          </div>
                          <button
                            onClick={() => handleUpgrade(key)}
                            disabled={busy || upgradingTo !== null}
                            className="mt-2 w-full rounded-lg bg-cyan-400 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
                          >
                            {busy ? "Processing…" : `Upgrade for ₹${price.toLocaleString("en-IN")}`}
                          </button>
                        </div>
                      )}

                      {isLower && (
                        <p className="mt-2 text-[11px] text-slate-600">
                          Downgrades are not available. Contact support.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to Home</Link>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY);
              router.refresh();
              window.location.reload();
            }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Lock dashboard (debug)
          </button>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-10 text-white">
          Loading dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}