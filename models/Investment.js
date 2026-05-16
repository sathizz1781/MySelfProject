import mongoose from 'mongoose';

const contributionSchema = new mongoose.Schema({
  date:   { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  note:   { type: String, default: '' },
}, { _id: true });

const investmentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:           { type: String, required: true },
  type:           {
    type: String,
    enum: ['mutual_fund', 'stocks', 'fd', 'ppf', 'nps', 'gold', 'crypto', 'bonds', 'real_estate', 'other'],
    default: 'mutual_fund',
  },
  investmentMode: { type: String, enum: ['lumpsum', 'sip'], default: 'lumpsum' },
  sipAmount:      { type: Number, default: 0 },          // monthly SIP instalment amount
  sipDay:         { type: Number, default: 1, min: 1, max: 28 }, // day of month SIP deducts
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
  contributions:  [contributionSchema],            // log of each manual/SIP payment
}, { timestamps: true });

export default mongoose.models.Investment || mongoose.model('Investment', investmentSchema);
