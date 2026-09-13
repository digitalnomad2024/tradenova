// api/verify-otp.js
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { verificationId, code } = req.body;

  // Make sure we have both the ID and the code
  if (!verificationId || !code) {
    return res.status(400).json({ error: 'Verification ID and OTP code are required' });
  }

  try {
    // Call Message Central's validateOtp endpoint
    // Note: This endpoint uses a GET request with query parameters
    const response = await fetch(
      `https://cpaas.messagecentral.com/verification/v3/validateOtp?verificationId=${verificationId}&code=${code}`,
      {
        method: 'GET',
        headers: {
          'authToken': process.env.OTP_AUTH_TOKEN,
        },
      }
    );

    const data = await response.json();

    // Check if the OTP was successfully verified
    if (data.data && data.data.verificationStatus === 'VERIFICATION_COMPLETED') {
      // ✅ OTP is correct!
      // In the future, you will generate a JWT token here to log the user in
      res.status(200).json({ 
        success: true, 
        message: 'Login successful'
      });
    } else {
      // ❌ Invalid or expired OTP
      res.status(400).json({ 
        success: false, 
        message: data.message || 'Invalid or expired OTP. Please try again.' 
      });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}