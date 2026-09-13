// api/send-otp.js

async function getAuthToken() {
  const customerId = process.env.MC_CUSTOMER_ID;
  const password = process.env.MC_PASSWORD;

  if (!customerId || !password) {
    throw new Error('Missing Message Central credentials in environment variables.');
  }

  const tokenUrl = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${customerId}&key=${btoa(password)}&scope=NEW&country=91`;

  const response = await fetch(tokenUrl, {
    method: 'GET', // This endpoint uses GET
    headers: {
      'accept': '*/*',
    },
  });

  const data = await response.json();

  if (!response.ok || !data.token) {
    throw new Error(data.message || 'Failed to generate auth token.');
  }

  return data.token;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // 1. Generate a fresh auth token
    const authToken = await getAuthToken();

    // 2. Use the token to send the OTP
    const sendUrl = `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=${phoneNumber}&otpLength=6`;

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'authToken': authToken, // Use the generated token
      },
    });

    const data = await response.json();

    // Message Central returns responseCode 200 on success
    if (data.responseCode !== 200) {
      throw new Error(data.message || `Failed to send OTP. Code: ${data.responseCode}`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      verificationId: data.data.verificationId 
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to send OTP. Please try again.' });
  }
}