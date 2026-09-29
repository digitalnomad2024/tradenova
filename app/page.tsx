"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ============================================================
// CONFIG
// ============================================================
const VPA = "choprashivam064-4@okhdfcbank";
const PAYEE_NAME = "Shivam Chopra";
const SUPPORT_EMAIL = "support@tradenova.com";
const ADMIN_PASSWORD = "tradenova-admin-2026";
// ============================================================

// ============================================================
// PLANS
// ============================================================
type Plan = {
  key: string;
  name: string;
  account: number;
  fee: number;
  bestValue?: boolean;
};

const PLANS: Plan[] = [
  { key: "starter",  name: "Starter",  account: 3000,  fee: 300  },
  { key: "basic",    name: "Basic",    account: 5000,  fee: 500  },
  { key: "growth",   name: "Growth",   account: 8000,  fee: 800  },
  { key: "pro",      name: "Pro",      account: 10000, fee: 1000 },
  { key: "advanced", name: "Advanced", account: 20000, fee: 2000, bestValue: true },
  { key: "elite",    name: "Elite",    account: 25000, fee: 2490 },
];

function getPlan(key: string | null): Plan | null {
  if (!key) return null;
  return PLANS.find((p) => p.key === key) ?? null;
}

// ============================================================
// AUTH (localStorage)
// ============================================================
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: number;
  plan?: string;
  accountSize?: number;
  purchasedAt?: number;
  status?: "pending_verification" | "active";
};

const USERS_KEY = "tradenova_users";
const SESSION_KEY = "tradenova_session";

function getAllUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAllUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function signup(name: string, email: string, password: string): User {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    throw new Error("An account with this email already exists.");
  }
  const user: User = {
    id: "usr_" + Math.random().toString(36).slice(2, 10),
    name: name.trim(),
    email: normalized,
    password,
    createdAt: Date.now(),
  };
  users.push(user);
  saveAllUsers(users);
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

function login(email: string, password: string): User {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user || user.password !== password) {
    throw new Error("Invalid email or password.");
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return getAllUsers().find((u) => u.id === id) ?? null;
}

function updateUser(userId: string, patch: Partial<User>) {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return;
  users[idx] = { ...users[idx], ...patch };
  saveAllUsers(users);
}

// ============================================================
// ROUTER
// ============================================================
type Route =
  | { name: "home" }
  | { name: "signup" }
  | { name: "login" }
  | { name: "challenge" }
  | { name: "checkout"; plan: string }
  | { name: "dashboard" }
  | { name: "admin" };

function parseHash(): Route {
  if (typeof window === "undefined") return { name: "home" };
  const hash = window.location.hash.replace(/^#/, "");
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");

  switch (path) {
    case "signup":    return { name: "signup" };
    case "login":     return { name: "login" };
    case "challenge": return { name: "challenge" };
    case "dashboard": return { name: "dashboard" };
    case "admin":     return { name: "admin" };
    case "checkout":
      return { name: "checkout", plan: params.get("plan") || "" };
    default:          return { name: "home" };
  }
}

function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>({ name: "home" });

  useEffect(() => {
    const update = () => setRoute(parseHash());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}

function navigate(to: string) {
  window.location.hash = to;
}

// ============================================================
// MAIN APP
// ============================================================
export default function Page() {
  const route = useHashRoute();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setReady(true);
  }, []);

  useEffect(() => {
    setUser(getCurrentUser());
  }, [route]);

  useEffect(() => {
    if (!ready) return;
    if (
      (route.name === "challenge" ||
        route.name === "checkout" ||
        route.name === "dashboard") &&
      !user
    ) {
      navigate("signup");
    }
  }, [ready, user, route]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  switch (route.name) {
    case "signup":
      return <SignupView onAuth={setUser} />;
    case "login":
      return <LoginView onAuth={setUser} />;
    case "challenge":
      return user ? <ChallengeView user={user} onLogout={setUser} /> : null;
    case "checkout":
      return user ? <CheckoutView user={user} planKey={route.plan} /> : null;
    case "dashboard":
      return user ? <DashboardView user={user} onLogout={setUser} /> : null;
    case "admin":
      return <AdminView />;
    default:
      return <HomeView />;
  }
}

// ============================================================
// SHARED UI
// ============================================================
function NavBar({
  user,
  onLogout,
}: {
  user?: User | null;
  onLogout?: (u: User | null) => void;
}) {
  return (
    <nav className="border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="#home" className="text-2xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <a href="#dashboard" className="text-slate-300 hover:text-white">
                Dashboard
              </a>
              <span className="text-slate-400">{user.name}</span>
              <button
                onClick={() => {
                  logout();
                  onLogout?.(null);
                  navigate("home");
                }}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="#login" className="text-slate-300 hover:text-white">
                Log In
              </a>
              <a
                href="#signup"
                className="rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

// ============================================================
// HOME
// ============================================================
function HomeView() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <NavBar />

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            🚀 The next generation trading platform
          </div>
          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Trade with confidence.
            <span className="block text-cyan-400">Grow with TradeNova.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            TradeNova is built for traders who want powerful tools, transparent
            rules, and a simple way to take their trading journey to the next level.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#signup"
              className="rounded-xl bg-cyan-400 px-7 py-4 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Get Started →
            </a>
            <a
              href="#challenge"
              className="rounded-xl border border-white/10 bg-white/5 px-7 py-4 font-semibold hover:bg-white/10"
            >
              Explore Challenges
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-8 text-center">
            <div className="text-3xl font-bold">$1M+</div>
            <div className="mt-2 text-sm text-slate-400">Target buying power</div>
          </div>
          <div className="p-8 text-center">
            <div className="text-3xl font-bold">24/7</div>
            <div className="mt-2 text-sm text-slate-400">Platform access</div>
          </div>
          <div className="p-8 text-center">
            <div className="text-3xl font-bold">Fast</div>
            <div className="mt-2 text-sm text-slate-400">Evaluation process</div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Why TradeNova
          </p>
          <h2 className="mt-3 text-4xl font-bold">Everything traders need.</h2>
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

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-10 text-center md:p-16">
          <h2 className="text-4xl font-bold">Ready to trade bigger?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Choose your challenge and start building your trading career with
            TradeNova.
          </p>
          <a
            href="#signup"
            className="mt-8 inline-block rounded-xl bg-cyan-400 px-8 py-4 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Get Started
          </a>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © 2026 TradeNova. All rights reserved.{" "}
        <a href="#admin" className="text-slate-600 hover:text-slate-400">
          •
        </a>
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
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </div>
  );
}

// ============================================================
// SIGNUP
// ============================================================
function SignupView({ onAuth }: { onAuth: (u: User) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const u = signup(name, email, password);
      onAuth(u);
      navigate("challenge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <a href="#home" className="block text-center text-3xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </a>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Start your TradeNova journey in under a minute.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shivam Chopra"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <a
              href="#login"
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Log in
            </a>
          </p>
        </div>
        <div className="mt-6 text-center text-xs text-slate-600">
          <a href="#home" className="hover:text-slate-400">
            ← Back to Home
          </a>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// LOGIN
// ============================================================
function LoginView({ onAuth }: { onAuth: (u: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = login(email, password);
      onAuth(u);
      navigate(u.plan ? "dashboard" : "challenge");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <a href="#home" className="block text-center text-3xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </a>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-400">
            Log in to continue your challenge.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {loading ? "Logging in…" : "Log In"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <a
              href="#signup"
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// CHALLENGE
// ============================================================
function ChallengeView({
  user,
  onLogout,
}: {
  user: User;
  onLogout: (u: User | null) => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <NavBar user={user} onLogout={onLogout} />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold text-slate-400">TradeNova</p>
          <h1 className="mt-2 text-4xl font-bold">Choose Your Challenge</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">
            Select a simulated trading account and start your TradeNova challenge.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-slate-900 p-6 ${
                plan.bestValue ? "border-green-500/50" : "border-slate-800"
              }`}
            >
              {plan.bestValue && (
                <div className="absolute right-4 top-4 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                  BEST VALUE
                </div>
              )}
              <p className="text-sm text-slate-400">{plan.name}</p>
              <h2 className="mt-2 text-3xl font-bold">
                ₹{plan.account.toLocaleString("en-IN")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">Simulated account</p>
              <div className="mt-6 rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Challenge Fee</p>
                <p className="mt-1 text-2xl font-bold">
                  ₹{plan.fee.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row label="Profit Target" value="8%" />
                <Row label="Daily Drawdown" value="5%" />
                <Row label="Maximum Drawdown" value="10%" />
                <Row label="Minimum Trading Days" value="5" />
                <Row label="Leverage" value="5×" />
                <Row label="Overnight" value="Allowed" />
              </div>
              <button
                onClick={() => navigate(`checkout?plan=${plan.key}`)}
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

// ============================================================
// CHECKOUT
// ============================================================
function CheckoutView({ user, planKey }: { user: User; planKey: string }) {
  const plan = getPlan(planKey);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [orderRef, setOrderRef] = useState("");
  const [upiUri, setUpiUri] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!plan) return;

    const ref = "ORD" + Date.now().toString(36).toUpperCase().slice(-6);
    setOrderRef(ref);

    const params = new URLSearchParams({
      pa: VPA,
      pn: PAYEE_NAME,
      am: plan.fee.toFixed(2),
      cu: "INR",
      tn: `TradeNova ${plan.name} ${ref}`,
    });
    const uri = "upi://pay?" + params.toString();
    setUpiUri(uri);

    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, uri, {
        width: 260,
        margin: 2,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      }).catch((err) => console.error("QR generation failed:", err));
    }
  }, [plan]);

  if (!plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Plan not found</h1>
          <p className="mt-3 text-slate-400">
            That plan doesn&apos;t exist. Please choose one from the challenges page.
          </p>
          <button
            onClick={() => navigate("challenge")}
            className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-slate-200"
          >
            ← Back to Challenges
          </button>
        </div>
      </main>
    );
  }

  function handlePaid() {
    if (!plan) return;
    setConfirming(true);
    updateUser(user.id, {
      plan: plan.key,
      accountSize: plan.account,
      purchasedAt: Date.now(),
      status: "pending_verification",
    });
    setTimeout(() => navigate("dashboard"), 400);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("challenge")}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          ← Back to Challenges
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">TradeNova</p>
            <h1 className="mt-2 text-3xl font-bold">{plan.name} Challenge</h1>
            <p className="mt-2 text-slate-400">
              Simulated account ₹{plan.account.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="mt-8 rounded-xl bg-slate-950 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Amount to Pay
            </p>
            <p className="mt-2 text-4xl font-bold">
              ₹{plan.fee.toLocaleString("en-IN")}
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <div className="rounded-2xl bg-white p-4">
              <canvas ref={canvasRef} className="block" />
            </div>

            {orderRef && (
              <p className="mt-4 rounded-lg bg-slate-950 px-4 py-2 font-mono text-sm text-slate-400">
                Reference: {orderRef}
              </p>
            )}

            <p className="mt-4 text-center text-sm text-slate-400">
              Open <strong className="text-slate-200">GPay</strong>,{" "}
              <strong className="text-slate-200">PhonePe</strong>,{" "}
              <strong className="text-slate-200">Paytm</strong>, or any UPI app,
              tap <strong className="text-slate-200">Scan QR</strong>, and point
              at the code above.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["GPay", "PhonePe", "Paytm", "BHIM", "Bank App"].map((app) => (
                <span
                  key={app}
                  className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300"
                >
                  {app}
                </span>
              ))}
            </div>

            {upiUri && (
              <a
                href={upiUri}
                className="mt-6 text-sm font-semibold text-blue-400 underline hover:text-blue-300 md:hidden"
              >
                Tap here to open your UPI app
              </a>
            )}
          </div>

          <div className="mt-8 border-t border-slate-800 pt-6">
            <button
              onClick={handlePaid}
              disabled={confirming}
              className="w-full rounded-xl bg-cyan-400 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {confirming
                ? "Setting up your account…"
                : "I've completed the payment →"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              Tap after paying. We&apos;ll verify your payment and activate your
              account within 24 hours. Email{" "}
              <span className="text-slate-300">{SUPPORT_EMAIL}</span> with the
              reference code if you have any issues.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardView({
  user,
  onLogout,
}: {
  user: User;
  onLogout: (u: User | null) => void;
}) {
  const plan = user.plan ? getPlan(user.plan) : null;

  const trades = useMemo(() => generateTrades(user.id, 60), [user.id]);

  const equityData = useMemo(() => {
    if (!plan) return [];
    let equity = plan.account;
    const startEquity = plan.account;
    let peak = startEquity;
    return [
      { trade: 0, equity: startEquity, dd: 0 },
      ...trades.map((t, i) => {
        equity += t.pnl;
        if (equity > peak) peak = equity;
        const dd = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
        return {
          trade: i + 1,
          equity: Math.round(equity),
          dd: Number(dd.toFixed(2)),
        };
      }),
    ];
  }, [plan, trades]);

  const metrics = useMemo(() => {
    if (!plan) return null;
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const grossWin = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const netPnl = grossWin - grossLoss;
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? grossWin / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;
    const currentEquity = plan.account + netPnl;
    const peakEquity = Math.max(
      ...equityData.map((d) => d.equity),
      plan.account
    );
    const maxDD = Math.min(...equityData.map((d) => d.dd), 0);
    const profitTarget = plan.account * 0.08;
    const targetProgress = Math.min(
      100,
      Math.max(0, (netPnl / profitTarget) * 100)
    );

    return {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      netPnl,
      netPnlPct: (netPnl / plan.account) * 100,
      currentEquity,
      peakEquity,
      maxDD,
      avgWin,
      avgLoss,
      profitFactor,
      profitTarget,
      targetProgress,
    };
  }, [plan, trades, equityData]);

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <NavBar user={user} onLogout={onLogout} />
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
          <p className="mt-3 text-slate-400">
            You haven&apos;t purchased a challenge yet. Choose one to get started.
          </p>
          <button
            onClick={() => navigate("challenge")}
            className="mt-8 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Choose a Challenge →
          </button>
        </div>
      </main>
    );
  }

  if (!metrics) return null;

  const profitColor = metrics.netPnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <NavBar user={user} onLogout={onLogout} />

      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold">Trading Performance</h1>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.status === "active"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-yellow-500/10 text-yellow-400"
              }`}
            >
              {user.status === "active" ? "ACTIVE" : "PENDING VERIFICATION"}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {plan.name} · ₹{plan.account.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Top stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard
            label="Account Size"
            value={`₹${plan.account.toLocaleString("en-IN")}`}
          />
          <StatCard
            label="Current Equity"
            value={`₹${Math.round(metrics.currentEquity).toLocaleString("en-IN")}`}
            sub={`${metrics.netPnlPct >= 0 ? "+" : ""}${metrics.netPnlPct.toFixed(2)}%`}
            subColor={profitColor}
          />
          <StatCard
            label="Net P&L"
            value={`${metrics.netPnl >= 0 ? "+" : ""}₹${Math.abs(
              metrics.netPnl
            ).toLocaleString("en-IN")}`}
            valueColor={profitColor}
          />
          <StatCard
            label="Max Drawdown"
            value={`${metrics.maxDD.toFixed(2)}%`}
            valueColor={metrics.maxDD < -10 ? "text-red-400" : "text-yellow-400"}
          />
        </div>

        {/* Profit target */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Profit Target Progress</span>
            <span className="text-sm font-semibold">
              {metrics.targetProgress.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-950">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all"
              style={{ width: `${metrics.targetProgress}%` }}
            />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>
              Current: ₹{Math.max(0, metrics.netPnl).toLocaleString("en-IN")}
            </span>
            <span>
              Target: ₹{metrics.profitTarget.toLocaleString("en-IN")} (8%)
            </span>
          </div>
        </div>

        {/* Equity chart */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equity Curve</h2>
            <span className="text-xs text-slate-500">
              {metrics.totalTrades} trades
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="trade" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [
                    `₹${v.toLocaleString("en-IN")}`,
                    "Equity",
                  ]}
                  labelFormatter={(l) => `Trade #${l}`}
                />
                <ReferenceLine
                  y={plan.account}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  label={{
                    value: "Start",
                    fill: "#94a3b8",
                    fontSize: 10,
                    position: "insideTopLeft",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#equityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Drawdown chart */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drawdown</h2>
            <span className="text-xs text-slate-500">
              Limit: 10% · Current: {metrics.maxDD.toFixed(2)}%
            </span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData}>
                <defs>
                  <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="trade" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`${v}%`, "Drawdown"]}
                  labelFormatter={(l) => `Trade #${l}`}
                />
                <ReferenceLine
                  y={-5}
                  stroke="#eab308"
                  strokeDasharray="4 4"
                  label={{
                    value: "Daily limit -5%",
                    fill: "#eab308",
                    fontSize: 10,
                    position: "insideBottomLeft",
                  }}
                />
                <ReferenceLine
                  y={-10}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{
                    value: "Max limit -10%",
                    fill: "#ef4444",
                    fontSize: 10,
                    position: "insideBottomLeft",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="dd"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#ddGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-lg font-semibold">Performance Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricBox
              label="Win Rate"
              value={`${metrics.winRate.toFixed(1)}%`}
              sub={`${metrics.wins}W / ${metrics.losses}L`}
              accent={metrics.winRate >= 50 ? "green" : "yellow"}
            />
            <MetricBox
              label="Profit Factor"
              value={metrics.profitFactor.toFixed(2)}
              sub={
                metrics.profitFactor >= 1.5
                  ? "Excellent"
                  : metrics.profitFactor >= 1
                  ? "Profitable"
                  : "Below break-even"
              }
              accent={
                metrics.profitFactor >= 1.5
                  ? "green"
                  : metrics.profitFactor >= 1
                  ? "yellow"
                  : "red"
              }
            />
            <MetricBox
              label="Total Trades"
              value={metrics.totalTrades.toString()}
              sub="Last 60 executions"
            />
            <MetricBox
              label="Average Win"
              value={`₹${Math.round(metrics.avgWin).toLocaleString("en-IN")}`}
              accent="green"
            />
            <MetricBox
              label="Average Loss"
              value={`₹${Math.round(metrics.avgLoss).toLocaleString("en-IN")}`}
              accent="red"
            />
            <MetricBox
              label="Peak Equity"
              value={`₹${metrics.peakEquity.toLocaleString("en-IN")}`}
            />
          </div>
        </div>

        {/* Trade history */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-lg font-semibold">Recent Trades</h2>
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Pair</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades
                  .slice(-15)
                  .reverse()
                  .map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-slate-800/50 last:border-0"
                    >
                      <td className="py-3 text-slate-500">{t.id}</td>
                      <td className="py-3 font-medium">{t.pair}</td>
                      <td className="py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            t.side === "BUY"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {new Date(t.date).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          t.pnl >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {t.pnl >= 0 ? "+" : ""}₹
                        {Math.abs(t.pnl).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules + details */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Challenge Rules</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Profit Target" value="8%" />
              <Row label="Daily Drawdown" value="5%" />
              <Row label="Maximum Drawdown" value="10%" />
              <Row label="Minimum Trading Days" value="5" />
              <Row label="Leverage" value="5×" />
              <Row label="Overnight Holding" value="Allowed" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Account Details</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Account Holder" value={user.name} />
              <Row label="Email" value={user.email} />
              <Row label="Plan" value={plan.name} />
              <Row
                label="Purchased"
                value={
                  user.purchasedAt
                    ? new Date(user.purchasedAt).toLocaleDateString("en-IN")
                    : "—"
                }
              />
              <Row label="Account ID" value={user.id} />
            </div>
          </div>
        </div>

        {user.status !== "active" && (
          <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6 text-center">
            <p className="text-sm text-cyan-300">
              We&apos;re verifying your payment. Your trading credentials will be
              emailed to <span className="font-semibold">{user.email}</span>{" "}
              within 24 hours.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  subColor,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueColor ?? ""}`}>{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${subColor ?? "text-slate-400"}`}>{sub}</p>
      )}
    </div>
  );
}

function MetricBox({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "green" | "red" | "yellow";
}) {
  const accentClass =
    accent === "green"
      ? "text-green-400"
      : accent === "red"
      ? "text-red-400"
      : accent === "yellow"
      ? "text-yellow-400"
      : "text-white";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

type Trade = {
  id: number;
  date: string;
  pair: string;
  side: "BUY" | "SELL";
  pnl: number;
};

function generateTrades(userId: string, count: number): Trade[] {
  let seed = 0;
  for (let i = 0; i < userId.length; i++) {
    seed = (seed * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  const pairs = [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "AUD/USD",
    "BTC/USD",
    "XAU/USD",
    "USD/CAD",
  ];
  const now = Date.now();
  const trades: Trade[] = [];

  for (let i = 0; i < count; i++) {
    const win = rand() > 0.42;
    const size = 120 + Math.floor(rand() * 480);
    const pnl = win ? size : -Math.round(size * (0.6 + rand() * 0.5));
    trades.push({
      id: i + 1,
      date: new Date(now - (count - i) * 5 * 3600 * 1000).toISOString(),
      pair: pairs[Math.floor(rand() * pairs.length)],
      side: rand() > 0.5 ? "BUY" : "SELL",
      pnl,
    });
  }
  return trades;
}

// ============================================================
// ADMIN
// ============================================================
function AdminView() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  function refresh() {
    setUsers(getAllUsers().sort((a, b) => b.createdAt - a.createdAt));
  }

  useEffect(() => {
    if (authed) refresh();
  }, [authed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
      setError("");
    } else {
      setError("Wrong password");
    }
  }

  function setStatus(userId: string, status: User["status"]) {
    updateUser(userId, { status });
    refresh();
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <a href="#home" className="block text-center text-2xl font-bold">
            Trade<span className="text-cyan-400">Nova</span>
          </a>
          <h1 className="mt-6 text-xl font-bold">Admin Access</h1>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Enter
            </button>
          </form>
        </div>
      </main>
    );
  }

  const pending = users.filter((u) => u.status === "pending_verification");
  const active = users.filter((u) => u.status === "active");
  const noPlan = users.filter((u) => !u.plan);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">TradeNova</p>
            <h1 className="mt-1 text-3xl font-bold">Admin Panel</h1>
          </div>
          <a
            href="#home"
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            ← Home
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <AdminStat label="Total Users" value={users.length} />
          <AdminStat
            label="Pending"
            value={pending.length}
            color="text-yellow-400"
          />
          <AdminStat
            label="Active"
            value={active.length}
            color="text-green-400"
          />
          <AdminStat
            label="No Plan"
            value={noPlan.length}
            color="text-slate-400"
          />
        </div>

        <AdminSection title="Pending Verification">
          {pending.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No pending users.</p>
          ) : (
            pending.map((u) => (
              <AdminUserRow
                key={u.id}
                user={u}
                onActivate={() => setStatus(u.id, "active")}
              />
            ))
          )}
        </AdminSection>

        <AdminSection title="Active Users">
          {active.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No active users yet.</p>
          ) : (
            active.map((u) => (
              <AdminUserRow
                key={u.id}
                user={u}
                onDeactivate={() => setStatus(u.id, "pending_verification")}
              />
            ))
          )}
        </AdminSection>

        <AdminSection title="Signed Up — No Plan Yet">
          {noPlan.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">
              Everyone has chosen a plan.
            </p>
          ) : (
            noPlan.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between border-b border-slate-800 py-4 last:border-0"
              >
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                </div>
                <p className="text-xs text-slate-500">
                  Signed up {new Date(u.createdAt).toLocaleString("en-IN")}
                </p>
              </div>
            ))
          )}
        </AdminSection>
      </div>
    </main>
  );
}

function AdminStat({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AdminSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function AdminUserRow({
  user,
  onActivate,
  onDeactivate,
}: {
  user: User;
  onActivate?: () => void;
  onDeactivate?: () => void;
}) {
  const plan = user.plan ? getPlan(user.plan) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-0">
      <div className="min-w-[200px]">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-slate-400">{user.email}</p>
      </div>
      <div className="text-sm">
        {plan ? (
          <>
            <p className="font-semibold">{plan.name} Challenge</p>
            <p className="text-slate-400">
              ₹{plan.fee.toLocaleString("en-IN")} • Account ₹
              {plan.account.toLocaleString("en-IN")}
            </p>
          </>
        ) : (
          <p className="text-slate-500">No plan</p>
        )}
      </div>
      <div className="text-xs text-slate-500">
        {user.purchasedAt
          ? `Paid ${new Date(user.purchasedAt).toLocaleString("en-IN")}`
          : `Signed up ${new Date(user.createdAt).toLocaleString("en-IN")}`}
      </div>
      <div className="flex gap-2">
        {onActivate && (
          <button
            onClick={onActivate}
            className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/30"
          >
            ✓ Activate
          </button>
        )}
        {onDeactivate && (
          <button
            onClick={onDeactivate}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}