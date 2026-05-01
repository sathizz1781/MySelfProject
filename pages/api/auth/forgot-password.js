import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    // Always respond the same way to avoid email enumeration
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = generateOtp();
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateModifiedOnly: true });

    // TODO: send email — return OTP in response for local dev
    return res.status(200).json({ message: 'OTP generated.', otp });
  } catch (err) {
    console.error('[forgot-password] error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
