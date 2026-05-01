import connectDB from '../../../lib/mongodb';
import LifeGoal from '../../../models/LifeGoal';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const goal = await LifeGoal.findById(id);
  if (!goal) return res.status(404).json({ error: 'Not found.' });
  if (goal.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { title, description, category, status, progress, milestones, deadline, notes, color } = req.body;
    if (title       !== undefined) goal.title       = title;
    if (description !== undefined) goal.description = description;
    if (category    !== undefined) goal.category    = category;
    if (status      !== undefined) goal.status      = status;
    if (progress    !== undefined) goal.progress    = Number(progress);
    if (milestones  !== undefined) goal.milestones  = milestones;
    if (deadline    !== undefined) goal.deadline    = deadline ? new Date(deadline) : undefined;
    if (notes       !== undefined) goal.notes       = notes;
    if (color       !== undefined) goal.color       = color;
    await goal.save();
    return res.status(200).json({ goal });
  }

  if (req.method === 'DELETE') {
    await goal.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
