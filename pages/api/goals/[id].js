import connectDB from '../../../lib/mongodb';
import SavingsGoal from '../../../models/SavingsGoal';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const goal = await SavingsGoal.findById(id);
  if (!goal) return res.status(404).json({ error: 'Goal not found.' });
  if (goal.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { name, targetAmount, savedAmount, deadline, currency, icon, color, notes, isCompleted } = req.body;
    if (name !== undefined) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = Number(targetAmount);
    if (savedAmount !== undefined) goal.savedAmount = Number(savedAmount);
    if (deadline !== undefined) goal.deadline = deadline || null;
    if (currency !== undefined) goal.currency = currency;
    if (icon !== undefined) goal.icon = icon;
    if (color !== undefined) goal.color = color;
    if (notes !== undefined) goal.notes = notes;
    if (isCompleted !== undefined) goal.isCompleted = Boolean(isCompleted);
    await goal.save();
    return res.status(200).json({ goal });
  }

  if (req.method === 'DELETE') {
    await goal.deleteOne();
    return res.status(200).json({ message: 'Goal deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
