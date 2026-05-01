import connectDB from '../../../lib/mongodb';
import Habit from '../../../models/Habit';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const habit = await Habit.findById(id);
  if (!habit) return res.status(404).json({ error: 'Not found.' });
  if (habit.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { name, description, frequency, color, targetPerWeek, isActive } = req.body;
    if (name          !== undefined) habit.name          = name;
    if (description   !== undefined) habit.description   = description;
    if (frequency     !== undefined) habit.frequency     = frequency;
    if (color         !== undefined) habit.color         = color;
    if (targetPerWeek !== undefined) habit.targetPerWeek = Number(targetPerWeek);
    if (isActive      !== undefined) habit.isActive      = Boolean(isActive);
    await habit.save();
    return res.status(200).json({ habit });
  }

  // POST — toggle today's completion
  if (req.method === 'POST') {
    const todayStr = new Date().toISOString().slice(0, 10);
    const idx = habit.completions.findIndex(c => new Date(c.date).toISOString().slice(0, 10) === todayStr);
    if (idx >= 0) habit.completions.splice(idx, 1);
    else habit.completions.push({ date: new Date() });
    await habit.save();
    const doneToday = idx < 0;
    return res.status(200).json({ habit: { ...habit.toObject(), doneToday } });
  }

  if (req.method === 'DELETE') {
    await habit.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
