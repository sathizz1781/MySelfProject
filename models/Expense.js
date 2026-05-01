import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    recurringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Recurring', default: null },
    amount:      { type: Number, required: true, min: 0.01 },
    type:        { type: String, enum: ['expense', 'income'], default: 'expense' },
    category:    { type: String, required: true },
    description: { type: String, trim: true, default: '' },
    merchant:    { type: String, trim: true, default: '' },
    tags:        { type: [String], default: [] },
    currency:    { type: String, default: 'INR' },
    date:        { type: Date, default: Date.now },
    isShared:    { type: Boolean, default: false },
    paidBy:      { type: String, default: '' },
    splitType:   { type: String, enum: ['equal', 'percentage', 'custom'], default: 'equal' },
    splitDetails: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ groupId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, tags: 1 });
ExpenseSchema.index({ userId: 1, merchant: 1 });

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
