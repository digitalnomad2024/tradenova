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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const planKey = String(body.plan || "");
    const customerName = String(body.customerName || "").trim();
    const customerEmail = String(body.customerEmail || "").trim();
    const customerPhone = String(body.customerPhone || "").replace(
      /\D/g,
      ""
    );

    if (!plans[planKey]) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid TradeNova plan.",
        },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer name is required.",
        },
        { status: 400 }
      );
    }

    if (!customerEmail || !customerEmail.includes("@")) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid customer email is required.",
        },
        { status: 400 }
      );
    }

    if (customerPhone.length !== 10) {
      return NextResponse.json(
        {
          success: false,
          error: "Valid 10-digit mobile number is required.",
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

    const plan = plans[planKey];

    const orderId = `tn_${planKey}_${Date.now()}`;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const cashfreeResponse = await fetch(
      "https://sandbox.cashfree.com/pg/orders",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": appId,
          "x-client-secret": secretKey,
          "x-idempotency-key": crypto.randomUUID(),
        },

        body: JSON.stringify({
          order_id: orderId,

          order_amount: plan.fee,

          order_currency: "INR",

          customer_details: {
            customer_id: `tn_customer_${Date.now()}`,

            customer_name: customerName,

            customer_email: customerEmail,

            customer_phone: customerPhone,
          },

          order_meta: {
            return_url: `${baseUrl}/checkout/success?order_id=${orderId}`,
          },

          order_note: `${plan.name} Challenge - TradeNova`,
        }),
      }
    );

    const data = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error("Cashfree error:", data);

      return NextResponse.json(
        {
          success: false,
          error:
            data?.message ||
            data?.error_description ||
            "Cashfree order creation failed.",
        },
        { status: cashfreeResponse.status }
      );
    }

    return NextResponse.json({
      success: true,

      orderId: data.order_id,

      paymentSessionId: data.payment_session_id,

      amount: plan.fee,

      currency: "INR",

      plan: planKey,

      planName: plan.name,

      account: plan.account,
    });
  } catch (error) {
    console.error("TradeNova Cashfree error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Cashfree payment order.",
      },
      { status: 500 }
    );
  }
}