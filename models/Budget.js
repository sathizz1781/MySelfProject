import mongoose from 'mongoose';

const BudgetSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category:     { type: String, required: true },
    amount:       { type: Number, required: true, min: 0 },
    month:        { type: String, required: true }, // 'YYYY-MM'
    isOverall:    { type: Boolean, default: false }, // overall monthly cap
    templateName: { type: String, default: '' },     // non-empty = this is a template row
  },
  { timestamps: true }
);

// Allow overall budget to coexist with per-category ones (category='__overall__')
BudgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true });
BudgetSchema.index({ userId: 1, templateName: 1 });

export default mongoose.models.Budget || mongoose.model('Budget', BudgetSchema);
