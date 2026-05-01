import connectDB from '../../../lib/mongodb';
import LifeGoal from '../../../models/LifeGoal';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const goals = await LifeGoal.find({ userId }).sort({ status: 1, createdAt: -1 }).lean();
    return res.status(200).json({ goals });
  }

  if (req.method === 'POST') {
    const { title, description, category, progress, milestones, deadline, notes, color } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });
    const goal = await LifeGoal.create({
      userId, title, description: description || '',
      category: category || 'personal', progress: Number(progress || 0),
      milestones: Array.isArray(milestones) ? milestones : [],
      deadline: deadline ? new Date(deadline) : undefined,
      notes: notes || '', color: color || '#6c63ff',
    });
    return res.status(201).json({ goal });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
