import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { groupId } = req.body;
  if (!groupId) return res.status(400).json({ error: 'groupId is required.' });

  await connectDB();

  const alreadyIn = await Group.findOne({ 'members.userId': authUser.userId });
  if (alreadyIn) return res.status(409).json({ error: 'You are already in a group.' });

  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ error: 'Group not found.' });

  const hasInvite = group.pendingInvites.some((i) => i.email === authUser.email);
  if (!hasInvite) return res.status(403).json({ error: 'No invite for your email.' });

  group.members.push({ userId: authUser.userId, email: authUser.email, name: authUser.name, role: 'member' });
  group.pendingInvites = group.pendingInvites.filter((i) => i.email !== authUser.email);
  await group.save();

  return res.status(200).json({ group });
}
