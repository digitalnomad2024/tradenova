import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Received body:", body);
    
    return NextResponse.json({
      success: true,
      orderId: "test_order_123",
      amount: 100000,
      currency: "INR",
      planName: "Starter",
      fee: 1000,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Something broke" },
      { status: 500 }
    );
  }
}