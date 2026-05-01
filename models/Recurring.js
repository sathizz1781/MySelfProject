import mongoose from 'mongoose';

const RecurringSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    groupId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Group', default: null },
    amount:      { type: Number, required: true, min: 0.01 },
    type:        { type: String, enum: ['expense', 'income'], default: 'expense' },
    category:    { type: String, required: true },
    description: { type: String, default: '' },
    merchant:    { type: String, default: '' },
    tags:        { type: [String], default: [] },
    currency:    { type: String, default: 'INR' },
    isShared:    { type: Boolean, default: false },
    frequency:   { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
    startDate:   { type: Date, required: true },
    nextDate:    { type: Date, required: true },
    lastCreated: { type: Date, default: null },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

RecurringSchema.index({ userId: 1, isActive: 1, nextDate: 1 });

export default mongoose.models.Recurring || mongoose.model('Recurring', RecurringSchema);
