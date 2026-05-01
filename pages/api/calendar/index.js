import connectDB from '../../../lib/mongodb';
import CalendarEvent from '../../../models/CalendarEvent';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const { year, month } = req.query;
    let dateFilter;
    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end   = new Date(start); end.setMonth(end.getMonth() + 1);
      dateFilter = { date: { $gte: start, $lt: end } };
    } else {
      const now = new Date(); now.setHours(0,0,0,0);
      const future = new Date(now); future.setDate(future.getDate() + 30);
      dateFilter = { date: { $gte: now, $lte: future } };
    }
    const events = await CalendarEvent.find({ userId, ...dateFilter }).sort({ date: 1 }).lean();
    return res.status(200).json({ events });
  }

  if (req.method === 'POST') {
    const { title, description, date, endDate, isAllDay, startTime, endTime, category, color, location } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required.' });
    const event = await CalendarEvent.create({
      userId, title, description: description || '',
      date: new Date(date), endDate: endDate ? new Date(endDate) : undefined,
      isAllDay: isAllDay !== false, startTime: startTime || '', endTime: endTime || '',
      category: category || 'personal', color: color || '#6c63ff', location: location || '',
    });
    return res.status(201).json({ event });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
