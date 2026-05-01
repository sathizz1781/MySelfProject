import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const expense = await Expense.findById(id);
  if (!expense) return res.status(404).json({ error: 'Not found.' });
  if (expense.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { amount, type, category, description, merchant, tags, currency, date, isShared, paidBy, splitType, splitDetails } = req.body;
    if (amount      !== undefined) expense.amount      = Number(amount);
    if (type        !== undefined) expense.type        = type;
    if (category    !== undefined) expense.category    = category;
    if (description !== undefined) expense.description = description;
    if (merchant    !== undefined) expense.merchant    = merchant;
    if (tags        !== undefined) expense.tags        = tags;
    if (currency    !== undefined) expense.currency    = currency;
    if (date        !== undefined) expense.date        = new Date(date);
    if (isShared    !== undefined) expense.isShared    = Boolean(isShared);
    if (paidBy      !== undefined) expense.paidBy      = paidBy;
    if (splitType   !== undefined) expense.splitType   = splitType;
    if (splitDetails !== undefined) expense.splitDetails = splitDetails;
    await expense.save();

    // Log edit to group activity
    if (expense.groupId) {
      const group = await Group.findById(expense.groupId);
      if (group) {
        group.activity.push({
          userId: new mongoose.Types.ObjectId(String(authUser.userId)),
          userEmail: authUser.email, userName: authUser.name,
          action: 'edited', detail: `₹${expense.amount} – ${expense.category}`,
        });
        if (group.activity.length > 200) group.activity = group.activity.slice(-200);
        await group.save();
      }
    }

    return res.status(200).json({ expense });
  }

  if (req.method === 'DELETE') {
    const groupId = expense.groupId;
    await expense.deleteOne();

    if (groupId) {
      const group = await Group.findById(groupId);
      if (group) {
        group.activity.push({
          userId: new mongoose.Types.ObjectId(String(authUser.userId)),
          userEmail: authUser.email, userName: authUser.name,
          action: 'deleted', detail: `₹${expense.amount} – ${expense.category}`,
        });
        if (group.activity.length > 200) group.activity = group.activity.slice(-200);
        await group.save();
      }
    }
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
