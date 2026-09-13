// app/api/payu/initiate/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

const planAmounts: Record<string, number> = {
  starter: 1000,
  basic: 1200,
  growth: 1440,
  pro: 1730,
  advanced: 2080,
  elite: 2490,
};

export async function POST(request: Request) {
  try {
    const { plan, customerName, customerEmail, customerPhone } = await request.json();

    const amount = planAmounts[plan];
    if (!amount) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const key = process.env.PAYU_MERCHANT_KEY!;
    const salt = process.env.PAYU_MERCHANT_SALT!;

    // Generate a unique transaction ID
    const txnid = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const productinfo = `TradeNova ${plan} Plan`;
    const firstname = customerName.split(" ")[0] || customerName;
    const email = customerEmail;

    // PayU hash logic: sha512(key|txnid|amount|productinfo|firstname|email|||||||||||salt)
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const payuUrl =
      process.env.PAYU_ENV === "LIVE"
        ? "https://secure.payu.in/_payment"
        : "https://test.payu.in/_payment";

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    return NextResponse.json({
      success: true,
      payuUrl,
      params: {
        key,
        txnid,
        amount: amount.toString(),
        productinfo,
        firstname,
        email,
        phone: customerPhone,
        hash,
        surl: `${siteUrl}/api/payu/success`,
        furl: `${siteUrl}/api/payu/failure`,
      },
    });
  } catch (error) {
    console.error("PayU initiation error:", error);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}