import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  month:    { type: String, required: true }, // "2024-01"
  amount:   { type: Number, required: true },
  dividend: { type: Number, default: 0 },
  paidOn:   { type: Date },
  notes:    { type: String, default: "" },
}, { _id: false });

const chitFundSchema = new mongoose.Schema({
  userId:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name:                { type: String, required: true },
  organizer:           { type: String, default: "" },
  groupSize:           { type: Number, required: true },
  monthlyContribution: { type: Number, required: true },
  duration:            { type: Number, required: true },
  startDate:           { type: Date, required: true },
  currency:            { type: String, default: "INR" },
  status:              { type: String, enum: ["active", "completed", "withdrawn"], default: "active" },
  potReceived:         { type: Boolean, default: false },
  potMonth:            { type: Number, default: 0 },
  potAmount:           { type: Number, default: 0 },
  payments:            { type: [paymentSchema], default: [] },
  notes:               { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.ChitFund || mongoose.model("ChitFund", chitFundSchema);
