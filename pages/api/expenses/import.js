import connectDB from '../../../lib/mongodb';
import Expense from '../../../models/Expense';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  const { csv } = req.body;
  if (!csv) return res.status(400).json({ error: 'CSV content is required.' });

  await connectDB();

  const lines = csv.trim().split('\n');
  if (lines.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row.' });

  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
  const dateIdx     = header.indexOf('date');
  const typeIdx     = header.indexOf('type');
  const categoryIdx = header.indexOf('category');
  const descIdx     = header.indexOf('description');
  const merchantIdx = header.indexOf('merchant');
  const amountIdx   = header.indexOf('amount');
  const currencyIdx = header.indexOf('currency');
  const tagsIdx     = header.indexOf('tags');

  if (amountIdx === -1 || categoryIdx === -1)
    return res.status(400).json({ error: 'CSV must have at least "amount" and "category" columns.' });

  const userId = new mongoose.Types.ObjectId(String(authUser.userId));
  const docs = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCSVLine(lines[i]);

    const amount = parseFloat(cols[amountIdx]);
    if (isNaN(amount) || amount <= 0) { errors.push(`Row ${i + 1}: invalid amount`); continue; }

    const category = cols[categoryIdx] || 'other';
    const type = typeIdx >= 0 && cols[typeIdx] === 'income' ? 'income' : 'expense';
    const dateStr = dateIdx >= 0 ? cols[dateIdx] : null;
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) { errors.push(`Row ${i + 1}: invalid date`); continue; }

    docs.push({
      userId,
      amount,
      type,
      category,
      description: descIdx >= 0 ? cols[descIdx] : '',
      merchant:    merchantIdx >= 0 ? cols[merchantIdx] : '',
      currency:    currencyIdx >= 0 && cols[currencyIdx] ? cols[currencyIdx] : 'INR',
      tags:        tagsIdx >= 0 && cols[tagsIdx] ? cols[tagsIdx].split(',').map(t => t.trim()).filter(Boolean) : [],
      date,
    });
  }

  if (docs.length === 0) return res.status(400).json({ error: 'No valid rows found.', errors });

  await Expense.insertMany(docs);
  return res.status(200).json({ imported: docs.length, errors });
}
