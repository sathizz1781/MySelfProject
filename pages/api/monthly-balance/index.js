import connectDB from "../../../lib/mongodb";
import { getAuthUser } from "../../../lib/auth";
import MonthlyBalance from "../../../models/MonthlyBalance";

export default async function handler(req, res) {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  await connectDB();
  const userId = user.userId;

  if (req.method === "GET") {
    const { year, month } = req.query;
    const record = await MonthlyBalance.findOne({ userId, year: Number(year), month: Number(month) });
    return res.json({ openingBalance: record?.openingBalance ?? 0 });
  }

  if (req.method === "POST") {
    const { year, month, openingBalance } = req.body;
    const record = await MonthlyBalance.findOneAndUpdate(
      { userId, year: Number(year), month: Number(month) },
      { openingBalance: Number(openingBalance) },
      { upsert: true, new: true }
    );
    return res.json({ openingBalance: record.openingBalance });
  }

  res.status(405).end();
}
