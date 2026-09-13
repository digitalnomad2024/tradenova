"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    identifier: "", // email or username
    password: "",
    remember: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.identifier.trim())
      newErrors.identifier = "Email or username is required";
    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      // Redirect to dashboard after successful login
      router.push("/dashboard");
    }, 1200);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-lg">
        {/* Logo */}
        <h1 className="text-center text-4xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </h1>
        <p className="mt-2 text-center text-slate-400">
          Log in to your trading evaluation account
        </p>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8"
        >
          {/* Email or Username */}
          <div>
            <label className="mb-1 block text-sm text-slate-300">
              Email or Username
            </label>
            <input
              type="text"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="you@example.com or trader123"
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-red-400">{errors.identifier}</p>
            )}
          </div>

          {/* Password */}
          <div className="mt-4">
            <label className="mb-1 block text-sm text-slate-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">{errors.password}</p>
            )}
          </div>

          {/* Remember & Forgot */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-400">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-cyan-400"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-cyan-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>

          {/* Signup Link */}
          <p className="mt-4 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-cyan-400 hover:underline">
              Create one
            </Link>
          </p>
        </form>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-white"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}