import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Expense ID is required.' });

  await connectDB();

  const original = await Expense.findById(id).lean();
  if (!original) return res.status(404).json({ error: 'Not found.' });
  if (original.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  const { _id, createdAt, updatedAt, ...fields } = original;
  const copy = await Expense.create({ ...fields, date: new Date(), description: `${fields.description || fields.category} (copy)` });

  return res.status(201).json({ expense: copy });
}
