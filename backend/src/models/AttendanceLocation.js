const mongoose = require('mongoose');

const ROLES = ['technician', 'supervisor', 'stores', 'procurement', 'delivery'];

const AttendanceLocationSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ROLES,
      required: true,
      unique: true
    },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    radius: { type: Number, default: 50 } // meters
  },
  { timestamps: true }
);

module.exports = mongoose.model('AttendanceLocation', AttendanceLocationSchema);
