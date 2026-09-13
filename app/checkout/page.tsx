"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const plans: Record<
  string,
  {
    name: string;
    account: string;
    fee: string;
  }
> = {
  starter: { name: "Starter", account: "₹3,000", fee: "₹1,000" },
  basic: { name: "Basic", account: "₹5,000", fee: "₹1,200" },
  growth: { name: "Growth", account: "₹8,000", fee: "₹1,440" },
  pro: { name: "Pro", account: "₹10,000", fee: "₹1,730" },
  advanced: { name: "Advanced", account: "₹20,000", fee: "₹2,080" },
  elite: { name: "Elite", account: "₹25,000", fee: "₹2,490" },
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "starter";
  const plan = plans[selectedPlan] || plans.starter;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    try {
      setLoading(true);

      // 1. Call your backend to create the order and get the hash
      const response = await fetch("/api/payu/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          customerName: fullName.trim(),
          customerEmail: email.trim(),
          customerPhone: cleanPhone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to create payment order.");
      }

      // 2. Dynamically create a form and auto-submit it to PayU
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payuUrl;

      Object.entries(data.params).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error ? error.message : "Something went wrong."
      );
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-lg pt-10">
        <h1 className="text-center text-4xl font-bold">
          Trade<span className="text-cyan-400">Nova</span>
        </h1>

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-bold">Checkout</h2>

          <div className="mt-6 rounded-xl bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Selected Plan</p>
            <p className="mt-1 text-xl font-bold">{plan.name}</p>
            <div className="mt-5 flex justify-between">
              <span className="text-slate-400">Account</span>
              <span>{plan.account}</span>
            </div>
            <div className="mt-3 flex justify-between">
              <span className="text-slate-400">Challenge Fee</span>
              <span className="font-bold text-cyan-400">{plan.fee}</span>
            </div>
          </div>

          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-6 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
          />

          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            placeholder="10-digit Mobile Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900 p-3 outline-none focus:border-cyan-400"
          />

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-cyan-400 p-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Opening Payment..." : `Pay ${plan.fee}`}
          </button>

          <p className="mt-3 text-center text-xs text-slate-600">
            PayU Sandbox Test Mode
          </p>
        </div>

        <Link
          href={`/challenge?plan=${selectedPlan}`}
          className="mt-6 block text-center text-sm text-slate-400 hover:text-white"
        >
          ← Back to Challenges
        </Link>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading...
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}