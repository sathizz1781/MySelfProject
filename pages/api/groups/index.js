import connectDB from '../../../lib/mongodb';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  if (req.method === 'GET') {
    const group = await Group.findOne({ 'members.userId': authUser.userId });
    const pendingGroup = group
      ? null
      : await Group.findOne({ 'pendingInvites.email': authUser.email });

    return res.status(200).json({
      group: group || null,
      pendingInvite: pendingGroup
        ? { groupId: pendingGroup._id, groupName: pendingGroup.name }
        : null,
    });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required.' });

    const existing = await Group.findOne({ 'members.userId': authUser.userId });
    if (existing) return res.status(409).json({ error: 'You are already in a group.' });

    const group = await Group.create({
      name,
      createdBy: authUser.userId,
      members: [{ userId: authUser.userId, email: authUser.email, name: authUser.name, role: 'admin' }],
    });

    return res.status(201).json({ group });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
