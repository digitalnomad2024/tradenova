"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!email) return;
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-lg">
        <h1 className="text-center text-4xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </h1>
        <p className="mt-2 text-center text-slate-400">
          Reset your password
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-8">
          {!sent ? (
            <>
              <h2 className="text-2xl font-bold">Enter your email</h2>
              <p className="mt-2 text-sm text-slate-400">
                We'll send a reset link to your inbox.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-6 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
              />

              <button
                onClick={handleSend}
                disabled={!email}
                className="mt-5 w-full rounded-xl bg-cyan-400 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-40"
              >
                Send Reset Link
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl">
                ✓
              </div>
              <h2 className="mt-6 text-center text-2xl font-bold text-green-400">
                Email Sent
              </h2>
              <p className="mt-3 text-center text-sm text-slate-400">
                If an account exists for <b>{email}</b>, a reset link has been sent.
              </p>
            </>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            Remembered it?{" "}
            <Link href="/login" className="text-cyan-400 hover:underline">
              Back to login
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}