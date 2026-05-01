import connectDB from '../../../lib/mongodb';
import Loan from '../../../models/Loan';
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
    const { type, party, principal, outstanding, interestRate, interestType, emiAmount, purpose, currency, startDate, dueDate, notes, status } = req.body;
    if (type        !== undefined) loan.type         = type;
    if (party       !== undefined) loan.party        = party;
    if (principal   !== undefined) loan.principal    = Number(principal);
    if (outstanding !== undefined) loan.outstanding  = Number(outstanding);
    if (interestRate !== undefined) loan.interestRate = Number(interestRate);
    if (interestType !== undefined) loan.interestType = interestType;
    if (emiAmount   !== undefined) loan.emiAmount    = Number(emiAmount);
    if (purpose     !== undefined) loan.purpose      = purpose;
    if (currency    !== undefined) loan.currency     = currency;
    if (startDate   !== undefined) loan.startDate    = new Date(startDate);
    if (dueDate     !== undefined) loan.dueDate      = dueDate ? new Date(dueDate) : undefined;
    if (notes       !== undefined) loan.notes        = notes;
    if (status      !== undefined) loan.status       = status;
    await loan.save();
    return res.status(200).json({ loan });
  }

  // POST to /api/loans/[id] with action=payment logs a repayment
  if (req.method === 'POST') {
    const { amount, date, note } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'Payment amount must be > 0.' });

    const paid = Number(amount);
    loan.payments.push({ amount: paid, date: date ? new Date(date) : new Date(), note: note || '' });
    loan.outstanding = Math.max(0, loan.outstanding - paid);
    if (loan.outstanding === 0) loan.status = 'closed';
    await loan.save();
    return res.status(200).json({ loan });
  }

  if (req.method === 'DELETE') {
    await loan.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
