import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  if (email.toLowerCase() === authUser.email) {
    return res.status(400).json({ error: 'You cannot invite yourself.' });
  }

  await connectDB();

  const group = await Group.findOne({ 'members.userId': authUser.userId });
  if (!group) return res.status(404).json({ error: 'Create a group first.' });

  if (group.members.some((m) => m.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'This person is already in your group.' });
  }
  if (group.pendingInvites.some((i) => i.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'Invite already sent.' });
  }

  group.pendingInvites.push({ email: email.toLowerCase() });
  await group.save();

  return res.status(200).json({ message: 'Invite sent.' });
}
