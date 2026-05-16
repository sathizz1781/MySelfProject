import connectDB from "../../../lib/mongodb";
import ChitFund from "../../../models/ChitFund";
import { getAuthUser } from "../../../lib/auth";

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  const { id } = req.query;
  await connectDB();

  const chit = await ChitFund.findById(id);
  if (!chit) return res.status(404).json({ error: "Not found." });
  if (chit.userId.toString() !== authUser.userId) return res.status(403).json({ error: "Forbidden." });

  // PUT — update chit details OR record a payment
  if (req.method === "PUT") {
    const { name, organizer, groupSize, monthlyContribution, contributionFrequencyMonths, duration, startDate, currency,
            status, potReceived, potMonth, potAmount, notes } = req.body;

    if (name                         !== undefined) chit.name                         = name;
    if (organizer                    !== undefined) chit.organizer                    = organizer;
    if (groupSize                    !== undefined) chit.groupSize                    = Number(groupSize);
    if (monthlyContribution          !== undefined) chit.monthlyContribution          = Number(monthlyContribution);
    if (contributionFrequencyMonths  !== undefined) chit.contributionFrequencyMonths  = Number(contributionFrequencyMonths);
    if (duration                     !== undefined) chit.duration                     = Number(duration);
    if (startDate           !== undefined) chit.startDate           = new Date(startDate);
    if (currency            !== undefined) chit.currency            = currency;
    if (status              !== undefined) chit.status              = status;
    if (potReceived         !== undefined) chit.potReceived         = Boolean(potReceived);
    if (potMonth            !== undefined) chit.potMonth            = Number(potMonth);
    if (potAmount           !== undefined) chit.potAmount           = Number(potAmount);
    if (notes               !== undefined) chit.notes               = notes;

    await chit.save();
    return res.status(200).json({ chit });
  }

  // POST — record a monthly payment
  if (req.method === "POST") {
    const { month, amount, dividend, paidOn, notes } = req.body;
    if (!month || amount === undefined) return res.status(400).json({ error: "month and amount are required." });

    // Replace existing payment for same month or push new
    const idx = chit.payments.findIndex(p => p.month === month);
    const entry = { month, amount: Number(amount), dividend: Number(dividend || 0), paidOn: paidOn ? new Date(paidOn) : new Date(), notes: notes || "" };
    if (idx >= 0) chit.payments[idx] = entry;
    else chit.payments.push(entry);

    await chit.save();
    return res.status(200).json({ chit });
  }

  // PATCH — delete a specific payment by month
  if (req.method === "PATCH") {
    const { deleteMonth } = req.body;
    if (!deleteMonth) return res.status(400).json({ error: "deleteMonth is required." });
    chit.payments = chit.payments.filter(p => p.month !== deleteMonth);
    await chit.save();
    return res.status(200).json({ chit });
  }

  // DELETE
  if (req.method === "DELETE") {
    await chit.deleteOne();
    return res.status(200).json({ message: "Deleted." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
