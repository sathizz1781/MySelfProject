import connectDB from '../../../lib/mongodb';
import Recurring from '../../../models/Recurring';
import Expense from '../../../models/Expense';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

function addFrequency(date, frequency) {
  const d = new Date(date);
  if (frequency === 'daily')   d.setDate(d.getDate() + 1);
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7);
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  if (frequency === 'yearly')  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  // Auto-apply any due recurring transactions for this user
  const due = await Recurring.find({
    userId: authUser.userId,
    isActive: true,
    nextDate: { $lte: new Date() },
  });

  for (const r of due) {
    await Expense.create({
      userId: r.userId,
      groupId: r.groupId,
      recurringId: r._id,
      amount: r.amount,
      type: r.type,
      category: r.category,
      description: r.description,
      merchant: r.merchant,
      tags: r.tags,
      currency: r.currency,
      isShared: r.isShared,
      date: r.nextDate,
    });
    r.lastCreated = r.nextDate;
    r.nextDate = addFrequency(r.nextDate, r.frequency);
    await r.save();
  }

  if (req.method === 'GET') {
    const recurrings = await Recurring.find({ userId: authUser.userId }).sort({ nextDate: 1 }).lean();
    return res.status(200).json({ recurrings });
  }

  if (req.method === 'POST') {
    const { amount, type, category, description, merchant, tags, currency, isShared, frequency, startDate } = req.body;
    if (!amount || !category || !frequency || !startDate)
      return res.status(400).json({ error: 'Amount, category, frequency and start date are required.' });

    const group = await Group.findOne({ 'members.userId': authUser.userId });
    const start = new Date(startDate);

    const recurring = await Recurring.create({
      userId: authUser.userId,
      groupId: isShared && group ? group._id : null,
      amount: Number(amount),
      type: type || 'expense',
      category,
      description: description || '',
      merchant: merchant || '',
      tags: tags || [],
      currency: currency || 'INR',
      isShared: Boolean(isShared),
      frequency,
      startDate: start,
      nextDate: start,
    });
    return res.status(201).json({ recurring });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
