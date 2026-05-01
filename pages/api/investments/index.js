import connectDB from '../../../lib/mongodb';
import Investment from '../../../models/Investment';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const investments = await Investment.find({ userId }).sort({ createdAt: -1 }).lean();

    const totalInvested = investments.reduce((s, i) => s + i.investedAmount, 0);
    const totalCurrent  = investments.reduce((s, i) => s + i.currentValue, 0);
    const totalGain     = totalCurrent - totalInvested;
    const gainPct       = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    // Group by type
    const byType = {};
    for (const inv of investments) {
      if (!byType[inv.type]) byType[inv.type] = { invested: 0, current: 0, count: 0 };
      byType[inv.type].invested += inv.investedAmount;
      byType[inv.type].current  += inv.currentValue;
      byType[inv.type].count    += 1;
    }

    return res.status(200).json({ investments, summary: { totalInvested, totalCurrent, totalGain, gainPct, byType } });
  }

  if (req.method === 'POST') {
    const { name, type, investedAmount, currentValue, units, avgPrice, currency, startDate, maturityDate, notes } = req.body;
    if (!name || investedAmount === undefined) return res.status(400).json({ error: 'name and investedAmount are required.' });

    const investment = await Investment.create({
      userId,
      name,
      type:           type || 'mutual_fund',
      investedAmount: Number(investedAmount),
      currentValue:   Number(currentValue ?? investedAmount),
      units:          Number(units || 0),
      avgPrice:       Number(avgPrice || 0),
      currency:       currency || 'INR',
      startDate:      startDate ? new Date(startDate) : new Date(),
      maturityDate:   maturityDate ? new Date(maturityDate) : undefined,
      notes:          notes || '',
    });
    return res.status(201).json({ investment });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
