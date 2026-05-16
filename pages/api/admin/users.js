import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import { getAuthUser } from '../../../lib/auth';

const ALL_APPS = ["expenses", "health", "habits", "notes", "goals", "calendar", "reports", "calculators"];

async function requireAdmin(req) {
  const decoded = getAuthUser(req);
  if (!decoded) return null;
  await connectDB();
  const user = await User.findById(decoded.userId).lean();
  if (!user || user.role !== 'admin') return null;
  return user;
}

export default async function handler(req, res) {
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      users: users.map(u => ({
        id: u._id.toString(), name: u.name, email: u.email,
        role: u.role || 'user',
        allowedApps: u.allowedApps?.length ? u.allowedApps : ALL_APPS,
        createdAt: u.createdAt,
      })),
    });
  }

  if (req.method === 'PUT') {
    const { userId, role, allowedApps } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const update = {};

    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
      if (userId === admin._id.toString()) return res.status(400).json({ error: 'Cannot change your own role' });
      update.role = role;
    }

    if (allowedApps !== undefined) {
      if (!Array.isArray(allowedApps)) return res.status(400).json({ error: 'allowedApps must be an array' });
      update.allowedApps = allowedApps.filter(a => ALL_APPS.includes(a));
    }

    await User.findByIdAndUpdate(userId, update);
    return res.status(200).json({ message: 'Updated' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
