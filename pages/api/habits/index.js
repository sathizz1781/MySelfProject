import connectDB from '../../../lib/mongodb';
import Habit from '../../../models/Habit';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const habits = await Habit.find({ userId }).sort({ createdAt: 1 }).lean();
    const todayStr = new Date().toISOString().slice(0, 10);
    const withStatus = habits.map(h => ({
      ...h,
      doneToday: h.completions.some(c => new Date(c.date).toISOString().slice(0, 10) === todayStr),
    }));
    return res.status(200).json({ habits: withStatus });
  }

  if (req.method === 'POST') {
    const { name, description, frequency, color, targetPerWeek } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const habit = await Habit.create({
      userId, name, description: description || '',
      frequency: frequency || 'daily', color: color || '#6c63ff',
      targetPerWeek: Number(targetPerWeek || 7),
    });
    return res.status(201).json({ habit });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
