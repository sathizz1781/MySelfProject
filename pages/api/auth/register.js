import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { signToken, setAuthCookie } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    await connectDB();

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Create user (password is hashed by the model's pre-save hook)
    const user = await User.create({ name, email, password });

    // Sign JWT and set cookie
    const token = signToken({ userId: user._id, email: user.email, name: user.name });
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Account created successfully.',
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[register] error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
}
