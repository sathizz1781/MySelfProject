import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:      { type: String, default: '' },
  content:    { type: String, default: '' },
  tags:       [{ type: String }],
  color:      { type: String, default: '#1b1b2e' },
  isPinned:   { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Note || mongoose.model('Note', noteSchema);
