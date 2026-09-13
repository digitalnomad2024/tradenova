import { NextResponse } from "next/server";

const plans: Record<
  string,
  {
    name: string;
    account: number;
    fee: number;
  }
> = {
  starter: {
    name: "Starter",
    account: 3000,
    fee: 1000,
  },
  basic: {
    name: "Basic",
    account: 5000,
    fee: 1200,
  },
  growth: {
    name: "Growth",
    account: 8000,
    fee: 1440,
  },
  pro: {
    name: "Pro",
    account: 10000,
    fee: 1730,
  },
  advanced: {
    name: "Advanced",
    account: 20000,
    fee: 2080,
  },
  elite: {
    name: "Elite",
    account: 25000,
    fee: 2490,
  },
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Order ID is required.",
        },
        { status: 400 }
      );
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;

    if (!appId || !secretKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Cashfree configuration is missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://sandbox.cashfree.com/pg/orders/${encodeURIComponent(
        orderId
      )}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": appId,
          "x-client-secret": secretKey,
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cashfree verification error:", data);

      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error_description ||
            "Unable to verify Cashfree payment.",
        },
        { status: response.status }
      );
    }

    const status = data.order_status;

    /*
      Our order IDs contain the plan key:

      tn_starter_...
      tn_basic_...
      tn_growth_...
      tn_pro_...
      tn_advanced_...
      tn_elite_...
    */

    const parts = orderId.split("_");

    const planKey = parts[1];

    const plan = plans[planKey];

    return NextResponse.json({
      success: true,
      status,
      orderId,
      plan: plan ? planKey : null,
      planName: plan ? plan.name : null,
      account: plan ? plan.account : null,
      amount: data.order_amount,
      currency: data.order_currency,
    });
  } catch (error) {
    console.error(
      "TradeNova payment verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}