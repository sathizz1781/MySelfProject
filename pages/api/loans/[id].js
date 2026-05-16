import connectDB from '../../../lib/mongodb';
import Loan from '../../../models/Loan';
import Expense from '../../../models/Expense';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const loan = await Loan.findById(id);
  if (!loan) return res.status(404).json({ error: 'Not found.' });
  if (loan.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { type, party, loanNumber, principal, outstanding, interestRate, interestType, emiAmount, tenureMonths, emiDay, purpose, currency, startDate, dueDate, notes, status } = req.body;
    if (type         !== undefined) loan.type         = type;
    if (party        !== undefined) loan.party        = party;
    if (loanNumber   !== undefined) loan.loanNumber   = loanNumber;
    if (principal    !== undefined) loan.principal    = Number(principal);
    if (outstanding  !== undefined) loan.outstanding  = Number(outstanding);
    if (interestRate !== undefined) loan.interestRate = Number(interestRate);
    if (interestType !== undefined) loan.interestType = interestType;
    if (emiAmount    !== undefined) loan.emiAmount    = Number(emiAmount);
    if (tenureMonths !== undefined) loan.tenureMonths = Number(tenureMonths);
    if (emiDay       !== undefined) loan.emiDay       = Number(emiDay);
    if (purpose      !== undefined) loan.purpose      = purpose;
    if (currency     !== undefined) loan.currency     = currency;
    if (startDate    !== undefined) loan.startDate    = new Date(startDate);
    if (dueDate      !== undefined) loan.dueDate      = dueDate ? new Date(dueDate) : undefined;
    if (notes        !== undefined) loan.notes        = notes;
    if (status       !== undefined) loan.status       = status;
    await loan.save();
    return res.status(200).json({ loan });
  }

  // POST to /api/loans/[id] logs a repayment and optionally creates an expense transaction
  if (req.method === 'POST') {
    const { amount, date, note, recordTransaction } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Payment amount must be > 0.' });

    const paid = Number(amount);
    const paymentDate = date ? new Date(date) : new Date();
    loan.payments.push({ amount: paid, date: paymentDate, note: note || '' });
    loan.outstanding = Math.max(0, loan.outstanding - paid);
    if (loan.outstanding === 0) loan.status = 'closed';
    await loan.save();

    if (recordTransaction) {
      const label = loan.loanNumber ? `${loan.party} (#${loan.loanNumber})` : loan.party;
      await Expense.create({
        userId:      loan.userId,
        type:        'expense',
        category:    'emi',
        description: `EMI – ${label}`,
        amount:      paid,
        date:        paymentDate,
        currency:    loan.currency || 'INR',
      });
    }

    return res.status(200).json({ loan });
  }

  if (req.method === 'DELETE') {
    await loan.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
