import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const group = await Group.findOne({ 'members.userId': authUser.userId });
  if (!group) return res.status(200).json({ activity: [] });

  if (req.method === 'GET') {
    const activity = [...(group.activity || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
    return res.status(200).json({ activity });
  }

  if (req.method === 'POST') {
    const { action, detail } = req.body;
    group.activity.push({ userId: authUser.userId, userEmail: authUser.email, userName: authUser.name, action, detail });
    if (group.activity.length > 200) group.activity = group.activity.slice(-200);
    await group.save();
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
