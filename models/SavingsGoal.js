import mongoose from 'mongoose';

const SavingsGoalSchema = new mongoose.Schema(
  {
    userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name:          { type: String, required: true, trim: true },
    targetAmount:  { type: Number, required: true, min: 1 },
    savedAmount:   { type: Number, default: 0 },
    deadline:      { type: Date, default: null },
    currency:      { type: String, default: 'INR' },
    icon:          { type: String, default: 'Target' },
    color:         { type: String, default: '#6c63ff' },
    isCompleted:   { type: Boolean, default: false },
    notes:         { type: String, default: '' },
  },
  { timestamps: true }
);

SavingsGoalSchema.index({ userId: 1, isCompleted: 1 });

export default mongoose.models.SavingsGoal || mongoose.model('SavingsGoal', SavingsGoalSchema);
