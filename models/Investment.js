import mongoose from 'mongoose';

const investmentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:           { type: String, required: true },
  type:           {
    type: String,
    enum: ['mutual_fund', 'stocks', 'fd', 'ppf', 'nps', 'gold', 'crypto', 'bonds', 'real_estate', 'other'],
    default: 'mutual_fund',
  },
  investedAmount: { type: Number, required: true, default: 0 },
  currentValue:   { type: Number, required: true, default: 0 },
  units:          { type: Number, default: 0 },          // shares / units held
  avgPrice:       { type: Number, default: 0 },          // avg buy price per unit
  currency:       { type: String, default: 'INR' },
  startDate:      { type: Date, default: Date.now },
  maturityDate:   { type: Date },                        // for FD / bonds
  notes:          { type: String, default: '' },
  isActive:       { type: Boolean, default: true },
  schemeCode:     { type: String, default: '' },   // mfapi.in scheme code for MFs
  stockSymbol:    { type: String, default: '' },   // NSE/BSE ticker for stocks
  stockExchange:  { type: String, default: 'NS' }, // NS = NSE, BO = BSE
  lastPriceAt:    { type: Date },                  // when price was last auto-fetched
}, { timestamps: true });

export default mongoose.models.Investment || mongoose.model('Investment', investmentSchema);
