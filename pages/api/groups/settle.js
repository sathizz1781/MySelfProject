import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();

  const group = await Group.findOne({ 'members.userId': authUser.userId });
  if (!group) return res.status(200).json({ balances: [], settlements: [] });

  const { month } = req.query;
  let dateFilter = {};
  if (month) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    dateFilter = { date: { $gte: start, $lt: end } };
  }

  const sharedExpenses = await Expense.find({
    groupId: group._id,
    isShared: true,
    type: 'expense',
    ...dateFilter,
  }).lean();

  const memberCount = group.members.length;
  if (memberCount < 2) return res.status(200).json({ balances: [], settlements: [] });

  // Build balance map: email -> net amount (positive = owed money, negative = owes money)
  const balances = {};
  for (const m of group.members) balances[m.email] = 0;

  for (const exp of sharedExpenses) {
    const payer = exp.paidBy || group.members.find(m => m.userId?.toString() === exp.userId?.toString())?.email;
    if (!payer || !balances.hasOwnProperty(payer)) continue;
    const share = exp.amount / memberCount;
    balances[payer] += exp.amount;
    for (const m of group.members) balances[m.email] -= share;
  }

  // Compute minimal settlements
  const debtors  = Object.entries(balances).filter(([, v]) => v < -0.01).map(([e, v]) => ({ email: e, amount: -v }));
  const creditors = Object.entries(balances).filter(([, v]) => v > 0.01).map(([e, v]) => ({ email: e, amount: v }));
  const settlements = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({ from: debtors[i].email, to: creditors[j].email, amount: Math.round(pay * 100) / 100 });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  const balanceList = group.members.map(m => ({
    name:  m.name || m.email,
    email: m.email,
    net:   Math.round((balances[m.email] || 0) * 100) / 100,
  }));

  return res.status(200).json({ balances: balanceList, settlements });
}
