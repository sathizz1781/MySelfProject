import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const { year, month: monthParam } = req.query;
  const userObjectId = new mongoose.Types.ObjectId(String(authUser.userId));
  const group = await Group.findOne({ 'members.userId': userObjectId });
  const groupId = group?._id;

  const userOrGroup = groupId
    ? { $or: [{ userId: userObjectId }, { groupId, isShared: true }] }
    : { userId: userObjectId };

  let dateFilter = {};
  if (year && monthParam) {
    const start = new Date(parseInt(year), parseInt(monthParam) - 1, 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    dateFilter = { date: { $gte: start, $lt: end } };
  }

  const expenses = await Expense.find({ ...userOrGroup, ...dateFilter })
    .sort({ date: -1 })
    .lean();

  const header = ['Date', 'Type', 'Category', 'Description', 'Merchant', 'Amount', 'Currency', 'Tags', 'Shared', 'Paid By'];
  const rows = expenses.map(e => [
    new Date(e.date).toISOString().slice(0, 10),
    e.type,
    e.category,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    `"${(e.merchant || '').replace(/"/g, '""')}"`,
    e.amount,
    e.currency || 'INR',
    `"${(e.tags || []).join(', ')}"`,
    e.isShared ? 'yes' : 'no',
    e.paidBy || '',
  ]);

  const csv = [header, ...rows].map(r => r.join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  return res.status(200).send(csv);
}
