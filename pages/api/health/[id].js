import connectDB from '../../../lib/mongodb';
import HealthEntry from '../../../models/HealthEntry';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.query;
  await connectDB();

  const entry = await HealthEntry.findById(id);
  if (!entry) return res.status(404).json({ error: 'Not found.' });
  if (entry.userId.toString() !== authUser.userId) return res.status(403).json({ error: 'Forbidden.' });

  if (req.method === 'PUT') {
    const fields = ['type','date','workoutType','duration','calories','distance','weight','bpSystolic','bpDiastolic','heartRate','steps','sleepHours','notes'];
    for (const f of fields) {
      if (req.body[f] !== undefined) entry[f] = f === 'date' ? new Date(req.body[f]) : req.body[f];
    }
    await entry.save();
    return res.status(200).json({ entry });
  }

  if (req.method === 'DELETE') {
    await entry.deleteOne();
    return res.status(200).json({ message: 'Deleted.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
