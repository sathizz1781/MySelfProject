import connectDB from '../../../lib/mongodb';
import CalendarEvent from '../../../models/CalendarEvent';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const event = await CalendarEvent.findById(id);
  if (!event) return res.status(404).json({ error: 'Not found.' });
  if (event.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { title, description, date, endDate, isAllDay, startTime, endTime, category, color, location } = req.body;
    if (title       !== undefined) event.title       = title;
    if (description !== undefined) event.description = description;
    if (date        !== undefined) event.date        = new Date(date);
    if (endDate     !== undefined) event.endDate     = endDate ? new Date(endDate) : undefined;
    if (isAllDay    !== undefined) event.isAllDay    = Boolean(isAllDay);
    if (startTime   !== undefined) event.startTime   = startTime;
    if (endTime     !== undefined) event.endTime     = endTime;
    if (category    !== undefined) event.category    = category;
    if (color       !== undefined) event.color       = color;
    if (location    !== undefined) event.location    = location;
    await event.save();
    return res.status(200).json({ event });
  }

  if (req.method === 'DELETE') {
    await event.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
