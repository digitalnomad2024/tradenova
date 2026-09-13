// app/api/payu/initiate/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { amount, productInfo, firstName, email, phone, txnId } = await request.json();
    
    const key = process.env.PAYU_MERCHANT_KEY!;
    const salt = process.env.PAYU_MERCHANT_SALT!;
    
    // Generate a unique transaction ID if not provided
    const transactionId = txnId || `TXN_${Date.now()}`;
    
    // Create the hash string in the exact order PayU expects
    const hashString = `${key}|${transactionId}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
    
    // Generate the SHA-512 hash
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    
    // PayU's payment endpoint (use test for now)
    const payuUrl = process.env.PAYU_ENV === 'LIVE' 
      ? 'https://secure.payu.in/_payment' 
      : 'https://test.payu.in/_payment';
    
    // Return the data needed for the frontend to build the form
    return NextResponse.json({
      success: true,
      payuUrl,
      params: {
        key,
        txnid: transactionId,
        amount,
        productinfo: productInfo,
        firstname: firstName,
        email,
        phone,
        hash,
        surl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payu/success`,
        furl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payu/failure`,
      }
    });
  } catch (error) {
    console.error('PayU initiation error:', error);
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
  }
}