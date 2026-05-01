import connectDB from '../../../lib/mongodb';
import HealthEntry from '../../../models/HealthEntry';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const { year, month } = req.query;
    let dateFilter = {};
    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end   = new Date(start); end.setMonth(end.getMonth() + 1);
      dateFilter = { date: { $gte: start, $lt: end } };
    } else {
      const since = new Date(); since.setDate(since.getDate() - 30);
      dateFilter = { date: { $gte: since } };
    }
    const entries = await HealthEntry.find({ userId, ...dateFilter }).sort({ date: -1 }).lean();
    return res.status(200).json({ entries });
  }

  if (req.method === 'POST') {
    const { type, date, workoutType, duration, calories, distance, weight, bpSystolic, bpDiastolic, heartRate, steps, sleepHours, notes } = req.body;
    if (!type) return res.status(400).json({ error: 'type is required.' });
    const entry = await HealthEntry.create({
      userId, type, date: date ? new Date(date) : new Date(),
      workoutType: workoutType || 'other',
      duration: Number(duration || 0), calories: Number(calories || 0), distance: Number(distance || 0),
      weight: Number(weight || 0), bpSystolic: Number(bpSystolic || 0), bpDiastolic: Number(bpDiastolic || 0),
      heartRate: Number(heartRate || 0), steps: Number(steps || 0), sleepHours: Number(sleepHours || 0),
      notes: notes || '',
    });
    return res.status(201).json({ entry });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
