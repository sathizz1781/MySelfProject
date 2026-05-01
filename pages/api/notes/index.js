import connectDB from '../../../lib/mongodb';
import Note from '../../../models/Note';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const { search, archived } = req.query;
    const query = { userId, isArchived: archived === 'true' };
    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }
    const notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 }).lean();
    return res.status(200).json({ notes });
  }

  if (req.method === 'POST') {
    const { title, content, tags, color, isPinned } = req.body;
    const note = await Note.create({
      userId, title: title || '', content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      color: color || '#1b1b2e', isPinned: Boolean(isPinned),
    });
    return res.status(201).json({ note });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
