import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+resetOtp +resetOtpExpiry'
    );

    if (!user || !user.resetOtp || !user.resetOtpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    if (new Date() > user.resetOtpExpiry) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (user.resetOtp !== otp.trim()) {
      return res.status(400).json({ error: 'Incorrect OTP.' });
    }

    user.password = password;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save({ validateModifiedOnly: true });

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('[reset-password] error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
