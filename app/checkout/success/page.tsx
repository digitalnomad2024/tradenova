"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "checking" | "paid" | "pending" | "failed" | "cancelled";

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("order_id");
  const cancelled = searchParams.get("cancelled");

  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    if (cancelled === "1") {
      setStatus("cancelled");
      setMessage("You cancelled the payment. No money was deducted.");
      return;
    }

    if (!orderId) {
      setStatus("failed");
      setMessage("Payment order ID is missing.");
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch(
          `/api/cashfree/verify?order_id=${encodeURIComponent(orderId)}`
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          setStatus("failed");
          setMessage(data.error || "Unable to verify payment.");
          return;
        }

        if (data.status === "PAID") {
          setStatus("paid");
          setMessage("Payment successful! Your challenge is ready.");
          if (data.plan) {
            localStorage.setItem("tradenova-current-plan", data.plan);
          }
        } else if (data.status === "ACTIVE" || data.status === "PENDING") {
          setStatus("pending");
          setMessage("Your payment is still being processed.");
        } else {
          setStatus("failed");
          setMessage("Payment was not completed.");
        }
      } catch (error) {
        console.error(error);
        setStatus("failed");
        setMessage("Unable to verify your payment.");
      }
    };

    verifyPayment();
  }, [orderId, cancelled]);

  const goToDashboard = () => {
    const plan = localStorage.getItem("tradenova-current-plan");
    if (plan) {
      router.push(`/dashboard?plan=${plan}`);
    } else {
      router.push("/challenge");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-8 text-center">

        {status === "checking" && (
          <>
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />
            <h1 className="text-2xl font-bold">Verifying Payment</h1>
            <p className="mt-3 text-slate-400">
              Please wait while we confirm your Cashfree payment.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-3xl">
              ✓
            </div>
            <h1 className="mt-6 text-3xl font-bold text-green-400">
              Payment Successful
            </h1>
            <p className="mt-3 text-slate-300">{message}</p>
            <button
              onClick={goToDashboard}
              className="mt-8 w-full rounded-xl bg-cyan-400 p-4 font-bold text-slate-950 hover:bg-cyan-300"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/20 text-3xl">
              !
            </div>
            <h1 className="mt-6 text-3xl font-bold text-yellow-400">
              Payment Processing
            </h1>
            <p className="mt-3 text-slate-300">{message}</p>
            <Link
              href="/challenge"
              className="mt-8 block w-full rounded-xl bg-white/10 p-4 text-center font-bold hover:bg-white/20"
            >
              Back to Challenges
            </Link>
          </>
        )}

        {status === "cancelled" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-500/20 text-3xl">
              ⚠
            </div>
            <h1 className="mt-6 text-3xl font-bold text-orange-400">
              Payment Cancelled
            </h1>
            <p className="mt-3 text-slate-300">{message}</p>
            <Link
              href="/checkout"
              className="mt-8 block w-full rounded-xl bg-cyan-400 p-4 text-center font-bold text-slate-950 hover:bg-cyan-300"
            >
              Try Again
            </Link>
            <Link
              href="/challenge"
              className="mt-3 block w-full rounded-xl bg-white/10 p-4 text-center font-bold hover:bg-white/20"
            >
              Back to Challenges
            </Link>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 text-3xl">
              ✕
            </div>
            <h1 className="mt-6 text-3xl font-bold text-red-400">
              Payment Not Confirmed
            </h1>
            <p className="mt-3 text-slate-300">{message}</p>
            <Link
              href="/checkout"
              className="mt-8 block w-full rounded-xl bg-cyan-400 p-4 text-center font-bold text-slate-950 hover:bg-cyan-300"
            >
              Try Again
            </Link>
            <Link
              href="/challenge"
              className="mt-3 block w-full rounded-xl bg-white/10 p-4 text-center font-bold hover:bg-white/20"
            >
              Back to Challenges
            </Link>
          </>
        )}

        {orderId && (
          <p className="mt-6 break-all text-xs text-slate-600">
            Order ID: {orderId}
          </p>
        )}
      </div>
    </main>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading...
        </main>
      }
    >
      <CheckoutResultContent />
    </Suspense>
  );
}