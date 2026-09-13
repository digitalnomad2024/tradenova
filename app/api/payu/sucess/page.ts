// app/api/payu/success/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const formData = await request.formData();
  const data = Object.fromEntries(formData.entries());
  
  const salt = process.env.PAYU_MERCHANT_SALT!;
  
  // Recreate the hash to verify the response is genuinely from PayU
  const hashString = `${data.key}|${data.txnid}|${data.amount}|${data.productinfo}|${data.firstname}|${data.email}|${data.udf1 || ''}|${data.udf2 || ''}|${data.udf3 || ''}|${data.udf4 || ''}|${data.udf5 || ''}||||||${data.status}||||||${salt}`;
  
  const expectedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  
  if (expectedHash !== data.hash) {
    // Hash mismatch - this request is not from PayU!
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment-failed?reason=invalid_signature`);
  }
  
  // Hash is valid. Now check the payment status.
  if (data.status === 'success') {
    // ✅ Payment was successful.
    // Here, you should:
    // 1. Verify the transaction status with PayU's API (get_Transaction_Details).
    // 2. Update your database to grant access to the user.
    // 3. Store the txnid to prevent duplicate processing.
    
    console.log(`Payment successful for txn: ${data.txnid}`);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment-success`);
  } else {
    // ❌ Payment failed.
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/payment-failed?reason=${data.status}`);
  }
}