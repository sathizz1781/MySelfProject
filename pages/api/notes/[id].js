import connectDB from '../../../lib/mongodb';
import Note from '../../../models/Note';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const note = await Note.findById(id);
  if (!note) return res.status(404).json({ error: 'Not found.' });
  if (note.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const { title, content, tags, color, isPinned, isArchived } = req.body;
    if (title      !== undefined) note.title      = title;
    if (content    !== undefined) note.content    = content;
    if (tags       !== undefined) note.tags       = tags;
    if (color      !== undefined) note.color      = color;
    if (isPinned   !== undefined) note.isPinned   = Boolean(isPinned);
    if (isArchived !== undefined) note.isArchived = Boolean(isArchived);
    await note.save();
    return res.status(200).json({ note });
  }

  if (req.method === 'DELETE') {
    await note.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
