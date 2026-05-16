import connectDB from '../../lib/mongodb';
import User from '../../models/User';
import { getAuthUser } from '../../lib/auth';

export default async function handler(req, res) {
  const decoded = getAuthUser(req);
  if (!decoded) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const user = await User.findById(decoded.userId).select('+password');
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (req.method === 'GET') {
    return res.status(200).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }

  if (req.method === 'PUT') {
    const { name, oldPassword, newPassword } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
      user.name = name.trim();
    }

    if (oldPassword !== undefined || newPassword !== undefined) {
      if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Both old and new password are required' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
      const match = await user.comparePassword(oldPassword);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      user.password = newPassword;
    }

    await user.save();
    return res.status(200).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
