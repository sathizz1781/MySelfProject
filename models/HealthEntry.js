import mongoose from 'mongoose';

const healthSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:         { type: String, enum: ['workout', 'vital'], required: true },
  date:         { type: Date, default: Date.now },
  // workout fields
  workoutType:  { type: String, enum: ['running','cycling','gym','yoga','swimming','walking','other'], default: 'other' },
  duration:     { type: Number, default: 0 },   // minutes
  calories:     { type: Number, default: 0 },
  distance:     { type: Number, default: 0 },   // km
  // vital fields
  weight:       { type: Number, default: 0 },   // kg
  bpSystolic:   { type: Number, default: 0 },
  bpDiastolic:  { type: Number, default: 0 },
  heartRate:    { type: Number, default: 0 },   // bpm
  steps:        { type: Number, default: 0 },
  sleepHours:   { type: Number, default: 0 },
  notes:        { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.HealthEntry || mongoose.model('HealthEntry', healthSchema);
