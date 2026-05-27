const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD in local date
    punchIn: { type: Date },
    punchOut: { type: Date },
    punchInLocation: {
      lat: { type: Number },
      lng: { type: Number }
    },
    punchOutLocation: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  { timestamps: true }
);

// One record per user per date
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
