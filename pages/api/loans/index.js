import connectDB from '../../../lib/mongodb';
import Loan from '../../../models/Loan';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const loans = await Loan.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ loans });
  }

  if (req.method === 'POST') {
    const { type, party, principal, interestRate, interestType, emiAmount, purpose, currency, startDate, dueDate, notes } = req.body;
    if (!type || !party || !principal) return res.status(400).json({ error: 'type, party, and principal are required.' });
    if (Number(principal) <= 0) return res.status(400).json({ error: 'Principal must be greater than 0.' });

    const loan = await Loan.create({
      userId,
      type,
      party,
      principal:    Number(principal),
      outstanding:  Number(principal),
      interestRate: Number(interestRate || 0),
      interestType: interestType || 'none',
      emiAmount:    Number(emiAmount || 0),
      purpose:      purpose || 'personal',
      currency:     currency || 'INR',
      startDate:    startDate ? new Date(startDate) : new Date(),
      dueDate:      dueDate ? new Date(dueDate) : undefined,
      notes:        notes || '',
    });
    return res.status(201).json({ loan });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
