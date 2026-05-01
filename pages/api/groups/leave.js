import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const group = await Group.findOne({ 'members.userId': authUser.userId });
  if (!group) return res.status(404).json({ error: 'You are not in a group.' });

  if (group.members.length === 1) {
    await group.deleteOne();
    return res.status(200).json({ message: 'Group deleted.' });
  }

  const isAdmin = group.members.find(
    (m) => m.userId.toString() === authUser.userId && m.role === 'admin'
  );
  group.members = group.members.filter((m) => m.userId.toString() !== authUser.userId);
  if (isAdmin) group.members[0].role = 'admin';
  await group.save();

  return res.status(200).json({ message: 'Left group.' });
}
