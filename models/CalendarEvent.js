import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  date:        { type: Date, required: true },
  endDate:     { type: Date },
  isAllDay:    { type: Boolean, default: true },
  startTime:   { type: String, default: '' },
  endTime:     { type: String, default: '' },
  category:    { type: String, enum: ['work','personal','health','family','social','other'], default: 'personal' },
  color:       { type: String, default: '#6c63ff' },
  location:    { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.CalendarEvent || mongoose.model('CalendarEvent', calendarEventSchema);
