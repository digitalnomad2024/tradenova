// api/send-otp.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Message Central uses the authToken as a header
    const response = await fetch(
      `https://cpaas.messagecentral.com/verification/v3/send?countryCode=91&flowType=SMS&mobileNumber=${phoneNumber}&otpLength=6`,
      {
        method: 'POST',
        headers: {
          'authToken': process.env.OTP_AUTH_TOKEN,
        },
      }
    );

    const data = await response.json();

    // Check for a successful response (responseCode 200)
    if (data.responseCode !== 200) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully',
      verificationId: data.data.verificationId // You will need this to validate later
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
}