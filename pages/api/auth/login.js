import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    await connectDB();

    // Find user and explicitly select password (it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({ userId: user._id, email: user.email, name: user.name });
    setAuthCookie(res, token);

    return res.status(200).json({
      message: 'Signed in successfully.',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[login] error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
