import connectDB from '../../../lib/mongodb';
import SavingsGoal from '../../../models/SavingsGoal';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  if (req.method === 'GET') {
    const goals = await SavingsGoal.find({ userId: authUser.userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ goals });
  }

  if (req.method === 'POST') {
    const { name, targetAmount, savedAmount, deadline, currency, icon, color, notes } = req.body;
    if (!name || !targetAmount) return res.status(400).json({ error: 'Name and target amount are required.' });
    const goal = await SavingsGoal.create({
      userId: authUser.userId,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount || 0),
      deadline: deadline || null,
      currency: currency || 'INR',
      icon: icon || 'Target',
      color: color || '#6c63ff',
      notes: notes || '',
    });
    return res.status(201).json({ goal });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
