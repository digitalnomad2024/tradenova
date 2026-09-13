"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

const plans: Record<string, { name: string; account: number; fee: number }> = {
  starter: { name: "Starter", account: 3000, fee: 1000 },
  basic: { name: "Basic", account: 5000, fee: 1200 },
  growth: { name: "Growth", account: 8000, fee: 1440 },
  pro: { name: "Pro", account: 10000, fee: 1730 },
  advanced: { name: "Advanced", account: 20000, fee: 2080 },
  elite: { name: "Elite", account: 25000, fee: 2490 },
};

function SignupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selected = searchParams.get("plan") || "starter";
  const plan = plans[selected] || plans.starter;

  const [mobile, setMobile] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Indian mobile number: starts with 6-9, 10 digits
  const validMobile = /^[6-9]\d{9}$/.test(mobile);

  // Password rules
  const passwordRules = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };
  const passwordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const createAccount = () => {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!validMobile) {
      setError("Enter a valid 10-digit Aadhaar-linked mobile number.");
      return;
    }
    if (!passwordValid) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and a number."
      );
      return;
    }
    if (!passwordsMatch) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      try {
        localStorage.setItem("tn_user", JSON.stringify({ name, email, mobile }));
        localStorage.setItem("tn_pending_plan", selected);
      } catch {}
      router.push(`/challenge?plan=${selected}`);
    }, 700);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAV */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold">
            Trade<span className="text-cyan-400">Nova</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:py-16">
        {/* LEFT — form */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Create your account
          </p>
          <h1 className="mt-2 text-3xl font-bold">Almost done</h1>
          <p className="mt-2 text-sm text-slate-400">
            Just your details and a password — then we'll take you to checkout.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs text-slate-500">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Mobile number <span className="text-slate-600">(for KYC)</span>
              </label>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-white/10 bg-slate-900 focus-within:border-cyan-400">
                <span className="flex items-center px-3 text-sm text-slate-400">
                  +91
                </span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="9876543210"
                  className="w-full bg-transparent py-3 pr-3 outline-none"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Your mobile must be linked with Aadhaar for KYC verification.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-500">
                Email <span className="text-slate-600">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs text-slate-500">Create password</label>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 pr-16 outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {password.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px]">
                  <li className={passwordRules.length ? "text-green-400" : "text-slate-500"}>
                    {passwordRules.length ? "✓" : "•"} At least 8 characters
                  </li>
                  <li className={passwordRules.hasUpper ? "text-green-400" : "text-slate-500"}>
                    {passwordRules.hasUpper ? "✓" : "•"} At least one uppercase letter
                  </li>
                  <li className={passwordRules.hasLower ? "text-green-400" : "text-slate-500"}>
                    {passwordRules.hasLower ? "✓" : "•"} At least one lowercase letter
                  </li>
                  <li className={passwordRules.hasNumber ? "text-green-400" : "text-slate-500"}>
                    {passwordRules.hasNumber ? "✓" : "•"} At least one number
                  </li>
                </ul>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-xs text-slate-500">Confirm password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
              />
              {confirmPassword.length > 0 && (
                <p
                  className={`mt-2 text-[11px] ${
                    passwordsMatch ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {passwordsMatch
                    ? "✓ Passwords match"
                    : "✕ Passwords do not match"}
                </p>
              )}
            </div>

            <button
              onClick={createAccount}
              disabled={
                loading ||
                !name.trim() ||
                !validMobile ||
                !passwordValid ||
                !passwordsMatch
              }
              className="mt-2 w-full rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
            >
              {loading ? "Creating account…" : "Create Account & Continue →"}
            </button>

            <p className="text-center text-[11px] text-slate-500">
              By continuing you agree to our Terms & Privacy Policy.
            </p>
          </div>
        </div>

        {/* RIGHT — plan summary */}
        <div className="lg:pt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs text-slate-500">You're signing up for</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">{plan.name}</p>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Account size</span>
                <span className="font-semibold">
                  ₹{plan.account.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">One-time fee</span>
                <span className="font-semibold">
                  ₹{plan.fee.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Profit target</span>
                <span className="font-semibold">8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time limit</span>
                <span className="font-semibold">None</span>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-900 p-3 text-xs text-slate-400">
              🔒 We only use your mobile for KYC and login. We never share it.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 p-10 text-white">
          Loading signup…
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}