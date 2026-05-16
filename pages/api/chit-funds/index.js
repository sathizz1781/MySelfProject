import connectDB from "../../../lib/mongodb";
import ChitFund from "../../../models/ChitFund";
import { getAuthUser } from "../../../lib/auth";
import mongoose from "mongoose";

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === "GET") {
    const chits = await ChitFund.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ chits });
  }

  if (req.method === "POST") {
    const { name, organizer, groupSize, monthlyContribution, contributionFrequencyMonths, duration, startDate, currency, notes } = req.body;
    if (!name || !groupSize || !monthlyContribution || !duration || !startDate)
      return res.status(400).json({ error: "name, groupSize, monthlyContribution, duration and startDate are required." });

    const chit = await ChitFund.create({
      userId, name,
      organizer:                   organizer || "",
      groupSize:                   Number(groupSize),
      monthlyContribution:         Number(monthlyContribution),
      contributionFrequencyMonths: Number(contributionFrequencyMonths || 1),
      duration:                    Number(duration),
      startDate:                   new Date(startDate),
      currency:                    currency || "INR",
      notes:                       notes || "",
    });
    return res.status(201).json({ chit });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
