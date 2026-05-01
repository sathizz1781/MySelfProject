import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:          { type: String, required: true },
  description:   { type: String, default: '' },
  frequency:     { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  color:         { type: String, default: '#6c63ff' },
  targetPerWeek: { type: Number, default: 7 },
  completions:   [{ date: { type: Date } }],
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Habit || mongoose.model('Habit', habitSchema);
