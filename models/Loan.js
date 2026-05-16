import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  date:   { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  note:   { type: String, default: '' },
}, { _id: true });

const loanSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:         { type: String, enum: ['borrowed', 'lent'], required: true },
  party:        { type: String, required: true },        // lender or borrower name
  principal:    { type: Number, required: true },        // original loan amount
  outstanding:  { type: Number, required: true },        // remaining balance
  interestRate: { type: Number, default: 0 },            // annual %
  interestType: { type: String, enum: ['none', 'simple', 'compound'], default: 'none' },
  emiAmount:    { type: Number, default: 0 },
  purpose:      { type: String, enum: ['home', 'car', 'personal', 'education', 'business', 'gold', 'other'], default: 'personal' },
  tenureMonths: { type: Number, default: 0 },
  emiDay:       { type: Number, default: 1, min: 1, max: 28 }, // day of month EMI is due
  currency:     { type: String, default: 'INR' },
  startDate:    { type: Date, default: Date.now },
  dueDate:      { type: Date },
  notes:        { type: String, default: '' },
  status:       { type: String, enum: ['active', 'closed'], default: 'active' },
  payments:     [paymentSchema],
}, { timestamps: true });

export default mongoose.models.Loan || mongoose.model('Loan', loanSchema);
