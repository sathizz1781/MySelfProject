import mongoose from 'mongoose';
import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(String(authUser.userId));
  const group  = await Group.findOne({ 'members.userId': userObjectId });
  const groupId = group?._id;

  if (req.method === 'GET') {
    const { year, selectedMonth, category, tag, merchant, search, view = 'all', limit = 100, skip = 0 } = req.query;

    let dateFilter = {};
    if (year && selectedMonth) {
      const start = new Date(parseInt(year, 10), parseInt(selectedMonth, 10) - 1, 1);
      const end   = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateFilter = { date: { $gte: start, $lt: end } };
    }

    let baseFilter;
    if (view === 'mine')              baseFilter = { userId: userObjectId };
    else if (view === 'shared' && groupId) baseFilter = { groupId, isShared: true };
    else baseFilter = groupId
      ? { $or: [{ userId: userObjectId }, { groupId, isShared: true }] }
      : { userId: userObjectId };

    const query = { ...baseFilter, ...dateFilter };
    if (category) query.category = category;
    if (tag)      query.tags = tag;
    if (merchant) query.merchant = { $regex: merchant, $options: 'i' };
    if (search)   query.$or = [
      { description: { $regex: search, $options: 'i' } },
      { merchant:    { $regex: search, $options: 'i' } },
      { tags:        { $regex: search, $options: 'i' } },
    ];

    const expenses = await Expense.find(query).sort({ date: -1 }).limit(Number(limit)).skip(Number(skip)).lean();
    const total    = await Expense.countDocuments(query);

    return res.status(200).json({ expenses, total, hasGroup: Boolean(groupId) });
  }

  if (req.method === 'POST') {
    const { amount, type, category, description, merchant, tags, currency, date, isShared, paidBy, splitType, splitDetails } = req.body;

    if (!amount || !category) return res.status(400).json({ error: 'Amount and category are required.' });
    if (Number(amount) <= 0)  return res.status(400).json({ error: 'Amount must be greater than 0.' });

    const shared = Boolean(isShared) && Boolean(groupId);
    const expense = await Expense.create({
      userId:      userObjectId,
      groupId:     shared ? groupId : null,
      amount:      Number(amount),
      type:        type || 'expense',
      category,
      description: description || '',
      merchant:    merchant || '',
      tags:        Array.isArray(tags) ? tags : [],
      currency:    currency || 'INR',
      date:        date ? new Date(date) : new Date(),
      isShared:    shared,
      paidBy:      paidBy || authUser.email,
      splitType:   splitType || 'equal',
      splitDetails: splitDetails || null,
    });

    // Log to group activity
    if (shared && group) {
      group.activity.push({
        userId: userObjectId, userEmail: authUser.email, userName: authUser.name,
        action: 'added', detail: `₹${amount} – ${category}`,
      });
      if (group.activity.length > 200) group.activity = group.activity.slice(-200);
      await group.save();
    }

    return res.status(201).json({ expense });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
