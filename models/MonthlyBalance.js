import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  year:           { type: Number, required: true },
  month:          { type: Number, required: true },
  openingBalance: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.models.MonthlyBalance || mongoose.model("MonthlyBalance", schema);
