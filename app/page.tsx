"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  AreaChart, Area, LineChart, Line,
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
const REFERRAL_COMMISSION_PCT = 10;
// ============================================================

// ============================================================
// PLANS
// ============================================================
type Plan = { key: string; name: string; account: number; fee: number; bestValue?: boolean };

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
// AUTH
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
  utr?: string;
  referredBy?: string;
};

const USERS_KEY = "tradenova_users";
const SESSION_KEY = "tradenova_session";

function getAllUsers(): User[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function saveAllUsers(users: User[]) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function signup(name: string, email: string, password: string, referredBy?: string): User {
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
    referredBy: referredBy?.trim() || undefined,
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
  if (!user || user.password !== password) throw new Error("Invalid email or password.");
  localStorage.setItem(SESSION_KEY, user.id);
  return user;
}
function logout() { localStorage.removeItem(SESSION_KEY); }
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
function resetPassword(email: string, newPassword: string): User {
  const users = getAllUsers();
  const normalized = email.trim().toLowerCase();
  const idx = users.findIndex((u) => u.email === normalized);
  if (idx === -1) throw new Error("No account found with that email.");
  if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
  users[idx].password = newPassword;
  saveAllUsers(users);
  return users[idx];
}

// ============================================================
// ROUTER
// ============================================================
type Route =
  | { name: "home" } | { name: "signup" } | { name: "login" } | { name: "forgot" }
  | { name: "challenge" } | { name: "checkout"; plan: string } | { name: "dashboard" }
  | { name: "withdraw" } | { name: "trade" } | { name: "admin" };

function parseHash(): Route {
  if (typeof window === "undefined") return { name: "home" };
  const hash = window.location.hash.replace(/^#/, "");
  const [path, query] = hash.split("?");
  const params = new URLSearchParams(query || "");
  switch (path) {
    case "signup":    return { name: "signup" };
    case "login":     return { name: "login" };
    case "forgot":    return { name: "forgot" };
    case "challenge": return { name: "challenge" };
    case "dashboard": return { name: "dashboard" };
    case "withdraw":  return { name: "withdraw" };
    case "trade":     return { name: "trade" };
    case "admin":     return { name: "admin" };
    case "checkout":  return { name: "checkout", plan: params.get("plan") || "" };
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
function navigate(to: string) { window.location.hash = to; }

// ============================================================
// MAIN APP
// ============================================================
export default function Page() {
  const route = useHashRoute();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { setUser(getCurrentUser()); setReady(true); }, []);
  useEffect(() => { setUser(getCurrentUser()); }, [route]);

  useEffect(() => {
    if (!ready) return;
    if (
      (route.name === "challenge" || route.name === "checkout" || route.name === "dashboard" ||
        route.name === "withdraw" || route.name === "trade") && !user
    ) navigate("signup");
  }, [ready, user, route]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  switch (route.name) {
    case "signup":    return <SignupView onAuth={setUser} />;
    case "login":     return <LoginView onAuth={setUser} />;
    case "forgot":    return <ForgotPasswordView />;
    case "challenge": return user ? <ChallengeView user={user} onLogout={setUser} /> : null;
    case "checkout":  return user ? <CheckoutView user={user} planKey={route.plan} /> : null;
    case "dashboard": return user ? <DashboardView user={user} onLogout={setUser} /> : null;
    case "withdraw":  return user ? <WithdrawView user={user} onLogout={setUser} /> : null;
    case "trade":     return user ? <TradeView user={user} onLogout={setUser} /> : null;
    case "admin":     return <AdminView />;
    default:          return <HomeView />;
  }
}

// ============================================================
// SHARED UI
// ============================================================
function NavBar({ user, onLogout }: { user?: User | null; onLogout?: (u: User | null) => void }) {
  return (
    <nav className="border-b border-white/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="#home" className="text-2xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </a>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <a href="#dashboard" className="text-slate-300 hover:text-white">Dashboard</a>
              <span className="text-slate-400">{user.name}</span>
              <button onClick={() => { logout(); onLogout?.(null); navigate("home"); }}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800">
                Log out
              </button>
            </>
          ) : (
            <>
              <a href="#login" className="text-slate-300 hover:text-white">Log In</a>
              <a href="#signup" className="rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300">
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
// REFERRAL CARD
// ============================================================
function ReferralCard({ user }: { user: User }) {
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, paid: 0, earned: 0 });

  useEffect(() => {
    const all = getAllUsers();
    const referred = all.filter((u) => u.referredBy === user.id);
    const paid = referred.filter((u) => u.plan);
    let earned = 0;
    for (const r of paid) {
      const p = r.plan ? getPlan(r.plan) : null;
      if (p) earned += Math.round(p.fee * (REFERRAL_COMMISSION_PCT / 100));
    }
    setStats({ total: referred.length, paid: paid.length, earned });
  }, [user.id]);

  const baseUrl = typeof window !== "undefined"
    ? window.location.origin + window.location.pathname
    : "";
  const referralLink = `${baseUrl}#signup?ref=${user.id}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "TradeNova",
          text: "Join TradeNova and start your trading challenge",
          url: referralLink,
        });
      } catch { /* cancelled */ }
    } else {
      copy();
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-purple-400/30 bg-gradient-to-br from-purple-500/5 to-slate-900 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-xl">
            🎁
          </div>
          <div>
            <h2 className="text-lg font-semibold">Refer & Earn</h2>
            <p className="text-xs text-slate-400">
              Earn {REFERRAL_COMMISSION_PCT}% commission on every challenge your friends buy.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Friends Referred</p>
          <p className="mt-1 text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Purchased</p>
          <p className="mt-1 text-2xl font-bold">{stats.paid}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Earned</p>
          <p className="mt-1 text-2xl font-bold text-green-400">₹{stats.earned.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mt-5">
        <label className="block text-xs font-medium text-slate-400">Your referral link</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            readOnly
            value={referralLink}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-xs text-slate-300 outline-none focus:border-purple-400"
          />
          <button
            onClick={copy}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              copied
                ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/40"
                : "bg-purple-500 text-white hover:bg-purple-400"
            }`}
          >
            {copied ? "✓ Copied" : "Copy Link"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={share}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          📤 Share
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent("Join TradeNova and start your trading challenge: " + referralLink)}`}
          target="_blank" rel="noopener noreferrer"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          WhatsApp
        </a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("Join TradeNova and start your trading challenge")}&url=${encodeURIComponent(referralLink)}`}
          target="_blank" rel="noopener noreferrer"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          X / Twitter
        </a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join TradeNova")}`}
          target="_blank" rel="noopener noreferrer"
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          Telegram
        </a>
        <a href={`mailto:?subject=${encodeURIComponent("Join TradeNova")}&body=${encodeURIComponent("Hey, check out TradeNova: " + referralLink)}`}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          Email
        </a>
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Commission is credited when your referred friend purchases a challenge. Payouts processed monthly.
      </p>
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
            TradeNova is built for traders who want powerful tools, transparent rules,
            and a simple way to take their trading journey to the next level.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#signup" className="rounded-xl bg-cyan-400 px-7 py-4 font-semibold text-slate-950 hover:bg-cyan-300">
              Get Started →
            </a>
            <a href="#challenge" className="rounded-xl border border-white/10 bg-white/5 px-7 py-4 font-semibold hover:bg-white/10">
              Explore Challenges
            </a>
          </div>
        </div>
      </section>
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="p-8 text-center"><div className="text-3xl font-bold">$1M+</div><div className="mt-2 text-sm text-slate-400">Target buying power</div></div>
          <div className="p-8 text-center"><div className="text-3xl font-bold">24/7</div><div className="mt-2 text-sm text-slate-400">Platform access</div></div>
          <div className="p-8 text-center"><div className="text-3xl font-bold">Fast</div><div className="mt-2 text-sm text-slate-400">Evaluation process</div></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">Why TradeNova</p>
          <h2 className="mt-3 text-4xl font-bold">Everything traders need.</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature title="Simple Challenges" description="Clear trading rules designed to make the evaluation process easy to understand." icon="⚡" />
          <Feature title="Powerful Dashboard" description="Track your account, performance, risk and progress from one place." icon="📊" />
          <Feature title="Trader First" description="Built around transparency, performance and a better trader experience." icon="🛡️" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-10 text-center md:p-16">
          <h2 className="text-4xl font-bold">Ready to trade bigger?</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Choose your challenge and start building your trading career with TradeNova.
          </p>
          <a href="#signup" className="mt-8 inline-block rounded-xl bg-cyan-400 px-8 py-4 font-semibold text-slate-950 hover:bg-cyan-300">
            Get Started
          </a>
        </div>
      </section>
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        © 2026 TradeNova. All rights reserved.{" "}
        <a href="#admin" className="text-slate-600 hover:text-slate-400">•</a>
      </footer>
    </main>
  );
}

function Feature({ title, description, icon }: { title: string; description: string; icon: string }) {
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
  const [referral, setReferral] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const query = hash.split("?")[1] || "";
    const params = new URLSearchParams(query);
    const ref = params.get("ref");
    if (ref) setReferral(ref);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      const u = signup(name, email, password, referral);
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
          <p className="mt-2 text-sm text-slate-400">Start your TradeNova journey in under a minute.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Shivam Chopra"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Referral Code <span className="text-slate-500">(optional)</span>
              </label>
              <input type="text" value={referral} onChange={(e) => setReferral(e.target.value)}
                placeholder="Friend's referral ID"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400"
                autoComplete="off" spellCheck={false} />
              <p className="mt-1 text-xs text-slate-500">
                If a friend referred you, enter their code so they get credit.
              </p>
            </div>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <a href="#login" className="font-semibold text-cyan-400 hover:text-cyan-300">Log in</a>
          </p>
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
          <p className="mt-2 text-sm text-slate-400">Log in to continue your challenge.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
              {loading ? "Logging in…" : "Log In"}
            </button>
            <div className="text-right">
              <a href="#forgot" className="text-xs font-medium text-slate-400 hover:text-cyan-400">Forgot Password?</a>
            </div>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <a href="#signup" className="font-semibold text-cyan-400 hover:text-cyan-300">Sign up</a>
          </p>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// FORGOT PASSWORD
// ============================================================
function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !newPassword || !confirmPassword) { setError("All fields are required."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    try {
      resetPassword(email, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
        <div className="w-full max-w-md rounded-2xl border border-green-500/30 bg-slate-900 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-2xl">✓</div>
          <h1 className="mt-4 text-2xl font-bold">Password reset</h1>
          <p className="mt-2 text-sm text-slate-400">Your password has been updated. Redirecting to login…</p>
          <a href="#login" className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <a href="#home" className="block text-center text-3xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </a>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-400">Enter your account email and choose a new password.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Remembered it?{" "}
            <a href="#login" className="font-semibold text-cyan-400 hover:text-cyan-300">Back to login</a>
          </p>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// CHALLENGE
// ============================================================
function ChallengeView({ user, onLogout }: { user: User; onLogout: (u: User | null) => void }) {
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
            <div key={plan.key}
              className={`relative rounded-2xl border bg-slate-900 p-6 ${plan.bestValue ? "border-green-500/50" : "border-slate-800"}`}>
              {plan.bestValue && (
                <div className="absolute right-4 top-4 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                  BEST VALUE
                </div>
              )}
              <p className="text-sm text-slate-400">{plan.name}</p>
              <h2 className="mt-2 text-3xl font-bold">₹{plan.account.toLocaleString("en-IN")}</h2>
              <p className="mt-1 text-sm text-slate-500">Simulated account</p>
              <div className="mt-6 rounded-xl bg-slate-950 p-4">
                <p className="text-xs text-slate-500">Challenge Fee</p>
                <p className="mt-1 text-2xl font-bold">₹{plan.fee.toLocaleString("en-IN")}</p>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row label="Profit Target" value="8%" />
                <Row label="Daily Drawdown" value="5%" />
                <Row label="Maximum Drawdown" value="10%" />
                <Row label="Minimum Trading Days" value="5" />
                <Row label="Leverage" value="5×" />
                <Row label="Overnight" value="Allowed" />
              </div>
              <button onClick={() => navigate(`checkout?plan=${plan.key}`)}
                className="mt-7 w-full rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-slate-200">
                Choose {plan.name}
              </button>
            </div>
          ))}
        </div>
        <div className="py-10 text-center text-xs text-slate-600">TradeNova simulated trading environment</div>
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
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!plan) return;
    const ref = "ORD" + Date.now().toString(36).toUpperCase().slice(-6);
    setOrderRef(ref);
    const params = new URLSearchParams({
      pa: VPA, pn: PAYEE_NAME, am: plan.fee.toFixed(2), cu: "INR",
      tn: `TradeNova ${plan.name} ${ref}`,
    });
    const uri = "upi://pay?" + params.toString();
    setUpiUri(uri);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, uri, {
        width: 260, margin: 2, errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      }).catch((err) => console.error("QR generation failed:", err));
    }
  }, [plan]);

  if (!plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Plan not found</h1>
          <p className="mt-3 text-slate-400">That plan doesn&apos;t exist. Please choose one from the challenges page.</p>
          <button onClick={() => navigate("challenge")}
            className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-slate-200">
            ← Back to Challenges
          </button>
        </div>
      </main>
    );
  }

  function handlePaid() {
    setError("");
    const cleaned = utr.trim().replace(/\s/g, "");
    if (!cleaned) { setError("Please enter your UTR / Transaction Reference Number."); return; }
    if (cleaned.length < 10) { setError("UTR should be at least 10 characters. Check your UPI app for the correct reference."); return; }
    if (cleaned.length > 22) { setError("UTR looks too long. Please check the number in your UPI app."); return; }
    if (!/^[A-Za-z0-9]+$/.test(cleaned)) { setError("UTR should contain only letters and numbers."); return; }

    setConfirming(true);
    updateUser(user.id, {
      plan: plan!.key,
      accountSize: plan!.account,
      purchasedAt: Date.now(),
      status: "pending_verification",
      utr: cleaned.toUpperCase(),
    });
    setTimeout(() => navigate("dashboard"), 500);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navigate("challenge")}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          ← Back to Challenges
        </button>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-400">TradeNova</p>
            <h1 className="mt-2 text-3xl font-bold">{plan.name} Challenge</h1>
            <p className="mt-2 text-slate-400">Simulated account ₹{plan.account.toLocaleString("en-IN")}</p>
          </div>

          <div className="mt-8 rounded-xl bg-slate-950 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-slate-500">Amount to Pay</p>
            <p className="mt-2 text-4xl font-bold">₹{plan.fee.toLocaleString("en-IN")}</p>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-slate-950">1</span>
              <h2 className="text-sm font-semibold text-slate-300">Scan and pay via UPI</h2>
            </div>
            <div className="flex flex-col items-center">
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
                tap <strong className="text-slate-200">Scan QR</strong>, and point at the code above.
              </p>
              {upiUri && (
                <a href={upiUri} className="mt-6 text-sm font-semibold text-blue-400 underline hover:text-blue-300 md:hidden">
                  Tap here to open your UPI app
                </a>
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-8">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-bold text-slate-950">2</span>
              <h2 className="text-sm font-semibold text-slate-300">Enter your UTR number</h2>
            </div>
            <p className="mb-4 text-sm text-slate-400">
              After paying, open your UPI app → tap the transaction → copy the{" "}
              <strong className="text-slate-200">UTR</strong> or{" "}
              <strong className="text-slate-200">Transaction ID</strong> (usually 12 digits).
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                UTR / Transaction Reference Number
              </label>
              <input type="text" value={utr}
                onChange={(e) => { setUtr(e.target.value); setError(""); }}
                placeholder="e.g., 412345678901" maxLength={24}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-white placeholder-slate-600 outline-none focus:border-cyan-400"
                autoComplete="off" spellCheck={false} />
            </div>
            {error && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}
            <button onClick={handlePaid} disabled={confirming}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50">
              {confirming ? "Submitting…" : "Submit for Verification →"}
            </button>
            <p className="mt-3 text-center text-xs text-slate-500">
              We&apos;ll verify your payment against your UTR and activate your account within 24 hours.
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
function DashboardView({ user, onLogout }: { user: User; onLogout: (u: User | null) => void }) {
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
        return { trade: i + 1, equity: Math.round(equity), dd: Number(dd.toFixed(2)) };
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
    const peakEquity = Math.max(...equityData.map((d) => d.equity), plan.account);
    const maxDD = Math.min(...equityData.map((d) => d.dd), 0);
    const profitTarget = plan.account * 0.08;
    const targetProgress = Math.min(100, Math.max(0, (netPnl / profitTarget) * 100));
    return {
      totalTrades: trades.length, wins: wins.length, losses: losses.length,
      winRate, netPnl, netPnlPct: (netPnl / plan.account) * 100,
      currentEquity, peakEquity, maxDD, avgWin, avgLoss, profitFactor,
      profitTarget, targetProgress,
    };
  }, [plan, trades, equityData]);

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <NavBar user={user} onLogout={onLogout} />
        <div className="mx-auto max-w-4xl px-4 py-10 md:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold">Welcome, {user.name}</h1>
            <p className="mt-3 text-slate-400">
              You haven&apos;t purchased a challenge yet. Choose one to get started.
            </p>
            <button onClick={() => navigate("challenge")}
              className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
              Choose a Challenge →
            </button>
          </div>
          <ReferralCard user={user} />
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold">Trading Performance</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              user.status === "active" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}`}>
              {user.status === "active" ? "ACTIVE" : "PENDING VERIFICATION"}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
              {plan.name} · ₹{plan.account.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Account Size" value={`₹${plan.account.toLocaleString("en-IN")}`} />
          <StatCard label="Current Equity"
            value={`₹${Math.round(metrics.currentEquity).toLocaleString("en-IN")}`}
            sub={`${metrics.netPnlPct >= 0 ? "+" : ""}${metrics.netPnlPct.toFixed(2)}%`}
            subColor={profitColor} />
          <StatCard label="Net P&L"
            value={`${metrics.netPnl >= 0 ? "+" : ""}₹${Math.abs(metrics.netPnl).toLocaleString("en-IN")}`}
            valueColor={profitColor} />
          <StatCard label="Max Drawdown" value={`${metrics.maxDD.toFixed(2)}%`}
            valueColor={metrics.maxDD < -10 ? "text-red-400" : "text-yellow-400"} />
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-400">Profit Target Progress</span>
            <span className="text-sm font-semibold">{metrics.targetProgress.toFixed(1)}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-950">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all"
              style={{ width: `${metrics.targetProgress}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs text-slate-500">
            <span>Current: ₹{Math.max(0, metrics.netPnl).toLocaleString("en-IN")}</span>
            <span>Target: ₹{metrics.profitTarget.toLocaleString("en-IN")} (8%)</span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equity Curve</h2>
            <span className="text-xs text-slate-500">{metrics.totalTrades} trades</span>
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
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Equity"]}
                  labelFormatter={(l) => `Trade #${l}`} />
                <ReferenceLine y={plan.account} stroke="#475569" strokeDasharray="4 4"
                  label={{ value: "Start", fill: "#94a3b8", fontSize: 10, position: "insideTopLeft" }} />
                <Area type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={2} fill="url(#equityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Drawdown</h2>
            <span className="text-xs text-slate-500">Limit: 10% · Current: {metrics.maxDD.toFixed(2)}%</span>
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
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }}
                  formatter={(v: any) => [`${Number(v)}%`, "Drawdown"]} labelFormatter={(l) => `Trade #${l}`} />
                <ReferenceLine y={-5} stroke="#eab308" strokeDasharray="4 4"
                  label={{ value: "Daily limit -5%", fill: "#eab308", fontSize: 10, position: "insideBottomLeft" }} />
                <ReferenceLine y={-10} stroke="#ef4444" strokeDasharray="4 4"
                  label={{ value: "Max limit -10%", fill: "#ef4444", fontSize: 10, position: "insideBottomLeft" }} />
                <Area type="monotone" dataKey="dd" stroke="#ef4444" strokeWidth={2} fill="url(#ddGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-lg font-semibold">Performance Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricBox label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`}
              sub={`${metrics.wins}W / ${metrics.losses}L`}
              accent={metrics.winRate >= 50 ? "green" : "yellow"} />
            <MetricBox label="Profit Factor" value={metrics.profitFactor.toFixed(2)}
              sub={metrics.profitFactor >= 1.5 ? "Excellent" : metrics.profitFactor >= 1 ? "Profitable" : "Below break-even"}
              accent={metrics.profitFactor >= 1.5 ? "green" : metrics.profitFactor >= 1 ? "yellow" : "red"} />
            <MetricBox label="Total Trades" value={metrics.totalTrades.toString()} sub="Last 60 executions" />
            <MetricBox label="Average Win" value={`₹${Math.round(metrics.avgWin).toLocaleString("en-IN")}`} accent="green" />
            <MetricBox label="Average Loss" value={`₹${Math.round(metrics.avgLoss).toLocaleString("en-IN")}`} accent="red" />
            <MetricBox label="Peak Equity" value={`₹${metrics.peakEquity.toLocaleString("en-IN")}`} />
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-lg font-semibold">Recent Trades</h2>
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-3">#</th><th className="pb-3">Pair</th><th className="pb-3">Side</th>
                  <th className="pb-3">Date</th><th className="pb-3 text-right">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(-15).reverse().map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/50 last:border-0">
                    <td className="py-3 text-slate-500">{t.id}</td>
                    <td className="py-3 font-medium">{t.pair}</td>
                    <td className="py-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        t.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {t.side}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(t.date).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className={`py-3 text-right font-semibold ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {t.pnl >= 0 ? "+" : ""}₹{Math.abs(t.pnl).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6 grid gap-5 md:grid-cols-2">
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
              <Row label="Purchased" value={user.purchasedAt ? new Date(user.purchasedAt).toLocaleDateString("en-IN") : "—"} />
              {user.utr && <Row label="UTR" value={user.utr} />}
              {user.referredBy && <Row label="Referred By" value={user.referredBy} />}
              <Row label="Account ID" value={user.id} />
            </div>
          </div>
        </div>

        {user.status !== "active" && (
          <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6 text-center">
            <p className="text-sm text-cyan-300">
              We&apos;re verifying your payment. Your trading credentials will be emailed to{" "}
              <span className="font-semibold">{user.email}</span> within 24 hours.
            </p>
          </div>
        )}

        <div className="mb-6">
          <ReferralCard user={user} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button onClick={() => navigate("withdraw")}
            className="group rounded-2xl border border-slate-700 bg-slate-900 px-6 py-6 text-left transition hover:border-slate-500 hover:bg-slate-800">
            <div className="text-2xl">💸</div>
            <div className="mt-3 text-lg font-semibold">Withdrawal</div>
            <div className="mt-1 text-sm text-slate-400">Request a payout from your profits</div>
          </button>
          <button onClick={() => { window.location.href = `/trade?plan=${user?.plan || "starter"}`; }}
            className="group rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-6 py-6 text-left transition hover:border-cyan-400/70 hover:bg-cyan-400/20">
            <div className="text-2xl">📈</div>
            <div className="mt-3 text-lg font-semibold text-cyan-300">Start Trading</div>
            <div className="mt-1 text-sm text-slate-400">Open the trading terminal</div>
          </button>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, subColor, valueColor }: {
  label: string; value: string; sub?: string; subColor?: string; valueColor?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueColor ?? ""}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

function MetricBox({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: "green" | "red" | "yellow";
}) {
  const accentClass =
    accent === "green" ? "text-green-400"
    : accent === "red" ? "text-red-400"
    : accent === "yellow" ? "text-yellow-400"
    : "text-white";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

type Trade = { id: number; date: string; pair: string; side: "BUY" | "SELL"; pnl: number };

function generateTrades(_userId: string, _count: number): any[] {
  return [];
}

// ============================================================
// WITHDRAWAL
// ============================================================
function WithdrawView({ user, onLogout }: { user: User; onLogout: (u: User | null) => void }) {
  const plan = user.plan ? getPlan(user.plan) : null;
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <NavBar user={user} onLogout={onLogout} />
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">No active plan</h1>
          <p className="mt-3 text-slate-400">You need a funded account before you can withdraw.</p>
          <button onClick={() => navigate("challenge")}
            className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
            Choose a Challenge →
          </button>
        </div>
      </main>
    );
  }

  const availableBalance = Math.round(plan.account * 0.08);
  const minWithdrawal = 500;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) { setError("Enter a valid amount."); return; }
    if (num < minWithdrawal) { setError(`Minimum withdrawal is ₹${minWithdrawal.toLocaleString("en-IN")}.`); return; }
    if (num > availableBalance) { setError(`Amount exceeds available balance of ₹${availableBalance.toLocaleString("en-IN")}.`); return; }
    if (method === "upi" && !upiId.trim()) { setError("Enter your UPI ID."); return; }
    if (method === "upi" && !upiId.includes("@")) { setError("UPI ID must contain @ (e.g., yourname@okhdfcbank)."); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <NavBar user={user} onLogout={onLogout} />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-green-500/30 bg-slate-900 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-2xl">✓</div>
            <h1 className="mt-4 text-2xl font-bold">Withdrawal requested</h1>
            <p className="mt-3 text-sm text-slate-400">
              We&apos;ll process your withdrawal to{" "}
              <span className="font-semibold text-slate-200">{upiId}</span> within 1–3 business days.
            </p>
            <button onClick={() => navigate("dashboard")}
              className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <NavBar user={user} onLogout={onLogout} />
      <div className="mx-auto max-w-2xl px-4 py-10">
        <button onClick={() => navigate("dashboard")}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
          ← Back to Dashboard
        </button>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">Withdraw Funds</h1>
          <p className="mt-2 text-sm text-slate-400">Withdraw your trading profits to your UPI or bank account.</p>
          <div className="mt-6 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="text-xs uppercase tracking-wide text-cyan-400">Available Balance</p>
            <p className="mt-2 text-3xl font-bold">₹{availableBalance.toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-slate-500">Minimum withdrawal ₹{minWithdrawal.toLocaleString("en-IN")}</p>
          </div>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300">Amount (INR)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" min={minWithdrawal}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">Payout Method</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setMethod("upi")}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    method === "upi" ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900"}`}>
                  UPI
                </button>
                <button type="button" onClick={() => setMethod("bank")}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    method === "bank" ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-700 bg-slate-950 text-slate-400 hover:bg-slate-900"}`}>
                  Bank Transfer
                </button>
              </div>
            </div>
            {method === "upi" && (
              <div>
                <label className="block text-sm font-medium text-slate-300">UPI ID</label>
                <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfcbank"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
              </div>
            )}
            {method === "bank" && (
              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-400">
                Bank transfers require additional verification. Email{" "}
                <span className="text-slate-200">{SUPPORT_EMAIL}</span> with your account details.
              </div>
            )}
            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}
            <button type="submit"
              className="w-full rounded-xl bg-cyan-400 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-300">
              Request Withdrawal
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// TRADE — LIVE SIMULATED TERMINAL
// ============================================================
type Instrument = {
  symbol: string;
  base: number;
  decimals: number;
  pipSize: number;
  pipValue: number;
};

const INSTRUMENTS: Instrument[] = [
  { symbol: "EUR/USD", base: 1.0850,  decimals: 5, pipSize: 0.0001, pipValue: 10 },
  { symbol: "GBP/USD", base: 1.2650,  decimals: 5, pipSize: 0.0001, pipValue: 10 },
  { symbol: "USD/JPY", base: 151.20,  decimals: 3, pipSize: 0.010,  pipValue: 10 },
  { symbol: "AUD/USD", base: 0.6580,  decimals: 5, pipSize: 0.0001, pipValue: 10 },
  { symbol: "BTC/USD", base: 67500,   decimals: 2, pipSize: 1,      pipValue: 1  },
  { symbol: "XAU/USD", base: 2340.50, decimals: 2, pipSize: 0.1,    pipValue: 10 },
  { symbol: "USD/CAD", base: 1.3580,  decimals: 5, pipSize: 0.0001, pipValue: 10 },
];

type LiveTrade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  size: number;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  openedAt: number;
  closedAt?: number;
  status: "open" | "closed";
};

type TradingState = { balance: number; trades: LiveTrade[] };

const TRADING_KEY_PREFIX = "tradenova_trading_";

function loadTradingState(userId: string, initialBalance: number): TradingState {
  if (typeof window === "undefined") return { balance: initialBalance, trades: [] };
  try {
    const raw = localStorage.getItem(TRADING_KEY_PREFIX + userId);
    if (!raw) return { balance: initialBalance, trades: [] };
    const parsed = JSON.parse(raw) as TradingState;
    if (typeof parsed.balance !== "number" || !Array.isArray(parsed.trades)) {
      return { balance: initialBalance, trades: [] };
    }
    return parsed;
  } catch {
    return { balance: initialBalance, trades: [] };
  }
}

function saveTradingState(userId: string, state: TradingState) {
  localStorage.setItem(TRADING_KEY_PREFIX + userId, JSON.stringify(state));
}

function calcPnl(trade: LiveTrade, currentPrice: number): number {
  const inst = INSTRUMENTS.find((s) => s.symbol === trade.symbol);
  if (!inst) return 0;
  const diff = trade.side === "BUY"
    ? currentPrice - trade.entryPrice
    : trade.entryPrice - currentPrice;
  return trade.size * (diff / inst.pipSize) * inst.pipValue;
}

function TradeView({ user, onLogout }: { user: User; onLogout: (u: User | null) => void }) {
  const plan = user.plan ? getPlan(user.plan) : null;

  if (!plan) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <NavBar user={user} onLogout={onLogout} />
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-2xl font-bold">No active plan</h1>
          <p className="mt-3 text-slate-400">Purchase a challenge before you can trade.</p>
          <button onClick={() => navigate("challenge")}
            className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
            Choose a Challenge →
          </button>
        </div>
      </main>
    );
  }

  return <TradingTerminal user={user} plan={plan} onLogout={onLogout} />;
}

function TradingTerminal({ user, plan, onLogout }: { user: User; plan: Plan; onLogout: (u: User | null) => void }) {
  const [symbol, setSymbol] = useState("EUR/USD");
  const [size, setSize] = useState(0.1);
  const [tab, setTab] = useState<"positions" | "history">("positions");
  const [state, setState] = useState<TradingState>(() => loadTradingState(user.id, plan.account));
  const [prices, setPrices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    INSTRUMENTS.forEach((s) => { init[s.symbol] = s.base; });
    return init;
  });
  const [priceHistory, setPriceHistory] = useState<{ time: number; price: number }[]>(() => [
    { time: Date.now(), price: INSTRUMENTS[0].base },
  ]);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevPriceRef = useRef<number>(prices[symbol]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices((prev) => {
        const next = { ...prev };
        for (const inst of INSTRUMENTS) {
          const drift = (Math.random() - 0.5) * inst.pipSize * 4;
          next[inst.symbol] = Math.max(inst.pipSize, prev[inst.symbol] + drift);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPriceHistory([{ time: Date.now(), price: prices[symbol] }]);
    prevPriceRef.current = prices[symbol];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  useEffect(() => {
    const current = prices[symbol];
    setPriceHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.price - current) < 0.0000001) return prev;
      return [...prev, { time: Date.now(), price: current }].slice(-80);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices[symbol]]);

  useEffect(() => {
    const prev = prevPriceRef.current;
    const curr = prices[symbol];
    if (curr !== prev) {
      setFlash(curr > prev ? "up" : "down");
      prevPriceRef.current = curr;
      const t = setTimeout(() => setFlash(null), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices[symbol]]);

  const inst = INSTRUMENTS.find((s) => s.symbol === symbol)!;
  const currentPrice = prices[symbol];

  const openPositions = state.trades.filter((t) => t.status === "open");
  const closedTrades = state.trades.filter((t) => t.status === "closed");

  const floatingPnl = openPositions.reduce((sum, t) => sum + calcPnl(t, prices[t.symbol]), 0);
  const equity = state.balance + floatingPnl;
  const sessionChange = ((currentPrice - inst.base) / inst.base) * 100;

  function openPosition(side: "BUY" | "SELL") {
    if (size <= 0 || size > 100) return;
    const trade: LiveTrade = {
      id: "t_" + Math.random().toString(36).slice(2, 10),
      symbol, side, size,
      entryPrice: currentPrice,
      pnl: 0,
      openedAt: Date.now(),
      status: "open",
    };
    const next: TradingState = { ...state, trades: [trade, ...state.trades] };
    setState(next);
    saveTradingState(user.id, next);
  }

  function closePosition(id: string) {
    const trade = state.trades.find((t) => t.id === id);
    if (!trade) return;
    const closedPrice = prices[trade.symbol];
    const pnl = calcPnl(trade, closedPrice);
    const closed: LiveTrade = { ...trade, status: "closed", exitPrice: closedPrice, pnl, closedAt: Date.now() };
    const next: TradingState = {
      balance: state.balance + pnl,
      trades: state.trades.map((t) => (t.id === id ? closed : t)),
    };
    setState(next);
    saveTradingState(user.id, next);
  }

  function closeAll() {
    if (openPositions.length === 0) return;
    if (!confirm(`Close all ${openPositions.length} position(s)?`)) return;
    let newBalance = state.balance;
    const updated = state.trades.map((t) => {
      if (t.status !== "open") return t;
      const closedPrice = prices[t.symbol];
      const pnl = calcPnl(t, closedPrice);
      newBalance += pnl;
      return { ...t, status: "closed" as const, exitPrice: closedPrice, pnl, closedAt: Date.now() };
    });
    const next: TradingState = { balance: newBalance, trades: updated };
    setState(next);
    saveTradingState(user.id, next);
  }

  function resetAccount() {
    if (!confirm("Reset your trading account? All positions and history will be erased.")) return;
    const next: TradingState = { balance: plan.account, trades: [] };
    setState(next);
    saveTradingState(user.id, next);
  }

  const floatingColor = floatingPnl > 0 ? "text-green-400" : floatingPnl < 0 ? "text-red-400" : "text-slate-400";
  const equityColor = equity >= plan.account ? "text-green-400" : "text-red-400";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <NavBar user={user} onLogout={onLogout} />

      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Trading Terminal</p>
            <h1 className="mt-1 text-2xl font-bold">{plan.name} · ₹{plan.account.toLocaleString("en-IN")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAccount}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              Reset Account
            </button>
            <button onClick={() => navigate("dashboard")}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
              ← Dashboard
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Balance" value={`₹${state.balance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
          <StatCard label="Equity" value={`₹${equity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} valueColor={equityColor} />
          <StatCard label="Floating P&L"
            value={`${floatingPnl >= 0 ? "+" : ""}₹${Math.abs(floatingPnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
            valueColor={floatingColor} />
          <StatCard label="Open Positions" value={openPositions.length.toString()} />
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
          {INSTRUMENTS.map((s) => {
            const active = s.symbol === symbol;
            return (
              <button key={s.symbol} onClick={() => setSymbol(s.symbol)}
                className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  active ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}>
                {s.symbol}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{symbol}</p>
                <p className={`mt-1 font-mono text-3xl font-bold transition-colors ${
                  flash === "up" ? "text-green-400" : flash === "down" ? "text-red-400" : "text-white"
                }`}>
                  {currentPrice.toFixed(inst.decimals)}
                </p>
              </div>
              <div className={`text-right text-sm font-semibold ${sessionChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {sessionChange >= 0 ? "▲" : "▼"} {Math.abs(sessionChange).toFixed(2)}%
                <p className="text-xs font-normal text-slate-500">session</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceHistory}>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }}
                      tickFormatter={(t) => new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      minTickGap={60} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} domain={["auto", "auto"]}
                      tickFormatter={(v) => v.toFixed(inst.decimals)} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: any) => [Number(v).toFixed(inst.decimals), symbol]}
                      labelFormatter={(t: any) => new Date(Number(t)).toLocaleTimeString("en-IN")} />
                    <Line type="monotone" dataKey="price"
                      stroke={sessionChange >= 0 ? "#22d3ee" : "#ef4444"}
                      strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-sm font-semibold text-slate-300">Place Order</h2>

              <div className="mt-4">
                <label className="block text-xs font-medium text-slate-400">Size (lots)</label>
                <input type="number" value={size}
                  onChange={(e) => setSize(Math.max(0.01, Math.min(100, Number(e.target.value) || 0)))}
                  step="0.01" min="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-400" />
                <div className="mt-2 flex gap-1">
                  {[0.01, 0.1, 0.5, 1].map((v) => (
                    <button key={v} onClick={() => setSize(v)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-500">Est. position value</p>
                <p className="mt-1 font-mono text-sm text-slate-200">
                  ₹{(size * currentPrice * 1000).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{size} lots · {symbol}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button onClick={() => openPosition("BUY")}
                  className="rounded-xl bg-green-500/20 py-3 font-bold text-green-400 ring-1 ring-green-500/40 transition hover:bg-green-500/30">
                  BUY
                </button>
                <button onClick={() => openPosition("SELL")}
                  className="rounded-xl bg-red-500/20 py-3 font-bold text-red-400 ring-1 ring-red-500/40 transition hover:bg-red-500/30">
                  SELL
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-500">Simulated execution · No real money</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm">
              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pip size</span>
                  <span className="font-mono">{inst.pipSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pip value</span>
                  <span className="font-mono">₹{inst.pipValue} / lot</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Leverage</span>
                  <span className="font-semibold">5×</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex gap-2">
              <button onClick={() => setTab("positions")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === "positions" ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}>
                Open Positions ({openPositions.length})
              </button>
              <button onClick={() => setTab("history")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === "history" ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                }`}>
                History ({closedTrades.length})
              </button>
            </div>
            {tab === "positions" && openPositions.length > 0 && (
              <button onClick={closeAll}
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20">
                Close All
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            {tab === "positions" && (
              openPositions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No open positions. Place a trade to get started.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-3">Symbol</th>
                        <th className="pb-3">Side</th>
                        <th className="pb-3 text-right">Size</th>
                        <th className="pb-3 text-right">Entry</th>
                        <th className="pb-3 text-right">Current</th>
                        <th className="pb-3 text-right">P&L</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {openPositions.map((t) => {
                        const current = prices[t.symbol];
                        const pnl = calcPnl(t, current);
                        const dec = INSTRUMENTS.find((s) => s.symbol === t.symbol)?.decimals ?? 2;
                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 last:border-0">
                            <td className="py-3 font-medium">{t.symbol}</td>
                            <td className="py-3">
                              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                t.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {t.side}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono">{t.size}</td>
                            <td className="py-3 text-right font-mono">{t.entryPrice.toFixed(dec)}</td>
                            <td className="py-3 text-right font-mono">{current.toFixed(dec)}</td>
                            <td className={`py-3 text-right font-mono font-semibold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {pnl >= 0 ? "+" : ""}₹{Math.abs(pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right">
                              <button onClick={() => closePosition(t.id)}
                                className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700">
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {tab === "history" && (
              closedTrades.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">No trades yet. Your closed positions will appear here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-3">Symbol</th>
                        <th className="pb-3">Side</th>
                        <th className="pb-3 text-right">Size</th>
                        <th className="pb-3 text-right">Entry</th>
                        <th className="pb-3 text-right">Exit</th>
                        <th className="pb-3 text-right">P&L</th>
                        <th className="pb-3 text-right">Closed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedTrades.slice(0, 50).map((t) => {
                        const dec = INSTRUMENTS.find((s) => s.symbol === t.symbol)?.decimals ?? 2;
                        return (
                          <tr key={t.id} className="border-b border-slate-800/50 last:border-0">
                            <td className="py-3 font-medium">{t.symbol}</td>
                            <td className="py-3">
                              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                t.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                {t.side}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono">{t.size}</td>
                            <td className="py-3 text-right font-mono">{t.entryPrice.toFixed(dec)}</td>
                            <td className="py-3 text-right font-mono">{t.exitPrice?.toFixed(dec)}</td>
                            <td className={`py-3 text-right font-mono font-semibold ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {t.pnl >= 0 ? "+" : ""}₹{Math.abs(t.pnl).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 text-right text-xs text-slate-500">
                              {t.closedAt ? new Date(t.closedAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// ADMIN
// ============================================================
function AdminView() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);

  function refresh() { setUsers(getAllUsers().sort((a, b) => b.createdAt - a.createdAt)); }
  useEffect(() => { if (authed) refresh(); }, [authed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) { setAuthed(true); setError(""); }
    else { setError("Wrong password"); }
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
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password" autoFocus
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-600 outline-none focus:border-cyan-400" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit"
              className="w-full rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
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
          <a href="#home" className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
            ← Home
          </a>
        </div>
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <AdminStat label="Total Users" value={users.length} />
          <AdminStat label="Pending" value={pending.length} color="text-yellow-400" />
          <AdminStat label="Active" value={active.length} color="text-green-400" />
          <AdminStat label="No Plan" value={noPlan.length} color="text-slate-400" />
        </div>
        <AdminSection title="Pending Verification">
          {pending.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No pending users.</p>
          ) : (
            pending.map((u) => (
              <AdminUserRow key={u.id} user={u} onActivate={() => setStatus(u.id, "active")} />
            ))
          )}
        </AdminSection>
        <AdminSection title="Active Users">
          {active.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">No active users yet.</p>
          ) : (
            active.map((u) => (
              <AdminUserRow key={u.id} user={u} onDeactivate={() => setStatus(u.id, "pending_verification")} />
            ))
          )}
        </AdminSection>
        <AdminSection title="Signed Up — No Plan Yet">
          {noPlan.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">Everyone has chosen a plan.</p>
          ) : (
            noPlan.map((u) => (
              <div key={u.id} className="flex items-center justify-between border-b border-slate-800 py-4 last:border-0">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-slate-400">{u.email}</p>
                </div>
                <p className="text-xs text-slate-500">Signed up {new Date(u.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))
          )}
        </AdminSection>
      </div>
    </main>
  );
}

function AdminStat({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function AdminSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function AdminUserRow({ user, onActivate, onDeactivate }: {
  user: User; onActivate?: () => void; onDeactivate?: () => void;
}) {
  const plan = user.plan ? getPlan(user.plan) : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 py-4 last:border-0">
      <div className="min-w-[200px]">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-slate-400">{user.email}</p>
        {user.utr && (
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-cyan-400/10 px-2 py-0.5 font-mono text-xs text-cyan-300">
            UTR: {user.utr}
          </p>
        )}
        {user.referredBy && (
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-purple-400/10 px-2 py-0.5 font-mono text-xs text-purple-300">
            Ref: {user.referredBy}
          </p>
        )}
      </div>
      <div className="text-sm">
        {plan ? (
          <>
            <p className="font-semibold">{plan.name} Challenge</p>
            <p className="text-slate-400">
              ₹{plan.fee.toLocaleString("en-IN")} • Account ₹{plan.account.toLocaleString("en-IN")}
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
          <button onClick={onActivate}
            className="rounded-lg bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-400 hover:bg-green-500/30">
            ✓ Activate
          </button>
        )}
        {onDeactivate && (
          <button onClick={onDeactivate}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
            Deactivate
          </button>
        )}
      </div>
    </div>
  );
}