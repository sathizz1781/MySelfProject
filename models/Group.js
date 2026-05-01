import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userEmail: String,
  userName:  String,
  action:    String, // 'added', 'edited', 'deleted', 'joined', 'left', 'invited'
  detail:    String,
  createdAt: { type: Date, default: Date.now },
});

const GroupSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        email:  String,
        name:   String,
        role:   { type: String, enum: ['admin', 'member'], default: 'member' },
      },
    ],
    pendingInvites: [{ email: String }],
    activity: { type: [ActivitySchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);
