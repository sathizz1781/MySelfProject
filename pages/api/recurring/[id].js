import connectDB from '../../../lib/mongodb';
import Recurring from '../../../models/Recurring';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const recurring = await Recurring.findById(id);
  if (!recurring) return res.status(404).json({ error: 'Not found.' });
  if (recurring.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { amount, type, category, description, merchant, tags, currency, frequency, isActive } = req.body;
    if (amount !== undefined) recurring.amount = Number(amount);
    if (type !== undefined) recurring.type = type;
    if (category !== undefined) recurring.category = category;
    if (description !== undefined) recurring.description = description;
    if (merchant !== undefined) recurring.merchant = merchant;
    if (tags !== undefined) recurring.tags = tags;
    if (currency !== undefined) recurring.currency = currency;
    if (frequency !== undefined) recurring.frequency = frequency;
    if (isActive !== undefined) recurring.isActive = Boolean(isActive);
    await recurring.save();
    return res.status(200).json({ recurring });
  }

  if (req.method === 'DELETE') {
    await recurring.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
