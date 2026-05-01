import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema({
  title:  { type: String, required: true },
  isDone: { type: Boolean, default: false },
}, { _id: true });

const lifeGoalSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  category:    { type: String, enum: ['health','career','personal','learning','finance','relationships','other'], default: 'personal' },
  status:      { type: String, enum: ['active','completed','abandoned'], default: 'active' },
  progress:    { type: Number, default: 0, min: 0, max: 100 },
  milestones:  [milestoneSchema],
  deadline:    { type: Date },
  notes:       { type: String, default: '' },
  color:       { type: String, default: '#6c63ff' },
}, { timestamps: true });

export default mongoose.models.LifeGoal || mongoose.model('LifeGoal', lifeGoalSchema);
