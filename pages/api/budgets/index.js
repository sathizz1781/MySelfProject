import connectDB from '../../../lib/mongodb';
import Budget from '../../../models/Budget';
import { getAuthUser } from '../../../lib/auth';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = new mongoose.Types.ObjectId(String(authUser.userId));

  if (req.method === 'GET') {
    const { month } = req.query;
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const budgets = await Budget.find({ userId, month: targetMonth }).lean();
    return res.status(200).json({ budgets });
  }

  if (req.method === 'POST') {
    const { category, amount, month, isOverall } = req.body;
    if (!category || amount === undefined || !month)
      return res.status(400).json({ error: 'category, amount, and month are required.' });

    const budget = await Budget.findOneAndUpdate(
      { userId, category, month },
      { amount: Number(amount), isOverall: Boolean(isOverall) },
      { upsert: true, new: true }
    );
    return res.status(200).json({ budget });
  }

  if (req.method === 'DELETE') {
    const { category, month } = req.body;
    await Budget.findOneAndDelete({ userId, category, month });
    return res.status(200).json({ message: 'Budget removed.' });
  }

  // PATCH — template operations
  if (req.method === 'PATCH') {
    const { action, month, templateName } = req.body;

    if (action === 'saveTemplate') {
      // Copy current month budgets as a template (set templateName on each)
      const current = await Budget.find({ userId, month, templateName: '' }).lean();
      if (current.length === 0) return res.status(400).json({ error: 'No budgets found for this month.' });
      // Remove existing template with same name
      await Budget.deleteMany({ userId, templateName });
      const docs = current.map(b => ({ userId, category: b.category, amount: b.amount, month: 'template', templateName }));
      await Budget.insertMany(docs);
      return res.status(200).json({ saved: docs.length });
    }

    if (action === 'loadTemplate') {
      const template = await Budget.find({ userId, templateName }).lean();
      if (template.length === 0) return res.status(404).json({ error: 'Template not found.' });
      for (const t of template) {
        await Budget.findOneAndUpdate(
          { userId, category: t.category, month },
          { amount: t.amount, isOverall: t.isOverall || false },
          { upsert: true }
        );
      }
      return res.status(200).json({ applied: template.length });
    }

    if (action === 'listTemplates') {
      const templates = await Budget.find({ userId, month: 'template' }).distinct('templateName');
      return res.status(200).json({ templates });
    }

    if (action === 'deleteTemplate') {
      await Budget.deleteMany({ userId, templateName, month: 'template' });
      return res.status(200).json({ message: 'Template deleted.' });
    }

    return res.status(400).json({ error: 'Unknown action.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
