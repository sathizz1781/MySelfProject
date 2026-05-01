import mongoose from 'mongoose';
import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import Budget from '../../../models/Budget';
import Group from '../../../models/Group';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { year, selectedMonth } = req.query;
  const targetYear     = year ? parseInt(year, 10) : new Date().getFullYear();
  const targetMonthNum = selectedMonth ? parseInt(selectedMonth, 10) : new Date().getMonth() + 1;
  const targetMonth    = `${targetYear}-${String(targetMonthNum).padStart(2, '0')}`;

  await connectDB();

  const userObjectId = new mongoose.Types.ObjectId(String(authUser.userId));
  const group  = await Group.findOne({ 'members.userId': userObjectId });
  const groupId = group?._id;

  const userOrGroup = groupId
    ? { $or: [{ userId: userObjectId }, { groupId, isShared: true }] }
    : { userId: userObjectId };

  const monthStart = new Date(`${targetMonth}-01`);
  const monthEnd   = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const yearStart = new Date(targetYear, 0, 1);
  const yearEnd   = new Date(targetYear + 1, 0, 1);

  const fiveYearStart = new Date(targetYear - 4, 0, 1);
  const fiveYearEnd   = new Date(targetYear + 1, 0, 1);

  const calendarMonthStart = new Date(targetYear, targetMonthNum - 1, 1);
  const calendarMonthEnd   = new Date(targetYear, targetMonthNum, 1);

  const monthQuery = { ...userOrGroup, date: { $gte: monthStart, $lt: monthEnd } };

  // ── All aggregations in parallel ─────────────────────────────────────
  const [
    dailyExpenses, monthlyExpenses, yearlyRaw, totals, byCategory,
    sharedAgg, topMerchants, monthlyRaw, prevMonthTotals,
  ] = await Promise.all([
    // Daily calendar
    Expense.aggregate([
      { $match: { ...userOrGroup, type: 'expense', date: { $gte: calendarMonthStart, $lt: calendarMonthEnd } } },
      { $group: { _id: { $dayOfMonth: '$date' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Monthly in year
    Expense.aggregate([
      { $match: { ...userOrGroup, type: 'expense', date: { $gte: yearStart, $lt: yearEnd } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // 5 years
    Expense.aggregate([
      { $match: { ...userOrGroup, type: 'expense', date: { $gte: fiveYearStart, $lt: fiveYearEnd } } },
      { $group: { _id: { year: { $year: '$date' } }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1 } },
    ]),
    // This month income/expense totals
    Expense.aggregate([
      { $match: monthQuery },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]),
    // Category breakdown this month
    Expense.aggregate([
      { $match: { ...monthQuery, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
    // Shared total
    groupId
      ? Expense.aggregate([
          { $match: { groupId, isShared: true, type: 'expense', date: { $gte: monthStart, $lt: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
      : Promise.resolve([]),
    // Top merchants this month
    Expense.aggregate([
      { $match: { ...monthQuery, type: 'expense', merchant: { $ne: '' } } },
      { $group: { _id: '$merchant', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
    ]),
    // 6-month trend (income + expense)
    Expense.aggregate([
      {
        $match: {
          ...userOrGroup,
          date: {
            $gte: new Date(new Date(monthStart).setMonth(monthStart.getMonth() - 5)),
            $lt: monthEnd,
          },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    // Previous month totals (for insights)
    Expense.aggregate([
      {
        $match: {
          ...userOrGroup,
          type: 'expense',
          date: {
            $gte: new Date(targetYear, targetMonthNum - 2, 1),
            $lt: monthStart,
          },
        },
      },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);

  const budgets = await Budget.find({ userId: userObjectId, month: targetMonth }).lean();

  // ── Build calendar days ───────────────────────────────────────────────
  const daysInMonth = new Date(targetYear, targetMonthNum, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const d   = dailyExpenses.find(x => x._id === day);
    return { day, total: d?.total || 0, count: d?.count || 0 };
  });

  // ── Build year months ─────────────────────────────────────────────────
  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const d     = monthlyExpenses.find(x => x._id === month);
    return {
      month,
      name: new Date(targetYear, i, 1).toLocaleString('default', { month: 'short' }),
      total: d?.total || 0,
      count: d?.count || 0,
    };
  });

  // ── Build year totals ─────────────────────────────────────────────────
  const yearTotals = Array.from({ length: 5 }, (_, i) => {
    const year = targetYear - 4 + i;
    const d    = yearlyRaw.find(x => x._id.year === year);
    return { year, total: d?.total || 0, count: d?.count || 0 };
  });

  // ── Build 6-month trend ───────────────────────────────────────────────
  const byMonth = [];
  for (let i = 5; i >= 0; i--) {
    const d   = new Date(monthStart);
    d.setMonth(d.getMonth() - i);
    const yr  = d.getFullYear();
    const mo  = d.getMonth() + 1;
    const lbl = d.toLocaleString('default', { month: 'short' });
    const exp = monthlyRaw.find(r => r._id.year === yr && r._id.month === mo && r._id.type === 'expense');
    const inc = monthlyRaw.find(r => r._id.year === yr && r._id.month === mo && r._id.type === 'income');
    byMonth.push({ label: lbl, expense: exp?.total || 0, income: inc?.total || 0 });
  }

  // ── Net worth over 6 months (cumulative income - expense) ─────────────
  const netWorth = [];
  let cumulative = 0;
  for (const m of byMonth) {
    cumulative += m.income - m.expense;
    netWorth.push({ label: m.label, net: Math.round(cumulative * 100) / 100 });
  }

  // ── Spending insights ─────────────────────────────────────────────────
  const totalExpense = totals.find(t => t._id === 'expense')?.total || 0;
  const totalIncome  = totals.find(t => t._id === 'income')?.total || 0;

  const insights = [];

  // Top category this month
  if (byCategory.length > 0) {
    const top = byCategory[0];
    const pct = totalExpense > 0 ? Math.round((top.total / totalExpense) * 100) : 0;
    insights.push({ type: 'info', text: `${top._id.charAt(0).toUpperCase() + top._id.slice(1)} is your top expense category at ${pct}% of total spending.` });
  }

  // Compare with previous month
  if (byCategory.length > 0 && prevMonthTotals.length > 0) {
    const prevTotal = prevMonthTotals.reduce((s, c) => s + c.total, 0);
    if (prevTotal > 0) {
      const change = Math.round(((totalExpense - prevTotal) / prevTotal) * 100);
      if (change > 10) insights.push({ type: 'warning', text: `You spent ${change}% more than last month.` });
      else if (change < -10) insights.push({ type: 'success', text: `You spent ${Math.abs(change)}% less than last month. Great job!` });
    }
  }

  // Budget alerts
  for (const b of budgets) {
    if (b.category === '__overall__') continue;
    const spent = byCategory.find(c => c._id === b.category)?.total || 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    if (pct >= 100) insights.push({ type: 'error', text: `Over budget on ${b.category} by ₹${Math.round(spent - b.amount).toLocaleString('en-IN')}.` });
    else if (pct >= 80) insights.push({ type: 'warning', text: `${b.category} is at ${Math.round(pct)}% of its budget.` });
  }

  // Savings rate
  if (totalIncome > 0) {
    const savings = totalIncome - totalExpense;
    const rate = Math.round((savings / totalIncome) * 100);
    if (rate > 0) insights.push({ type: 'success', text: `You saved ${rate}% of your income this month.` });
    else insights.push({ type: 'warning', text: `Your expenses exceeded your income by ₹${Math.round(Math.abs(savings)).toLocaleString('en-IN')}.` });
  }

  return res.status(200).json({
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
    sharedTotal: sharedAgg[0]?.total || 0,
    byCategory: byCategory.map(c => ({ category: c._id, total: c.total, count: c.count })),
    topMerchants: topMerchants.map(m => ({ merchant: m._id, total: m.total, count: m.count })),
    byMonth,
    netWorth,
    insights,
    budgets,
    groupId:     groupId || null,
    groupName:   group?.name || null,
    groupMembers: group?.members || [],
    calendarDays,
    yearMonths,
    yearTotals,
    selectedYear:  targetYear,
    selectedMonth: targetMonthNum,
  });
}
