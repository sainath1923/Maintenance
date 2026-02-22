const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['tenant', 'supervisor', 'admin', 'technician'], required: true },
    phone: String,
    technicianType: { type: String },
    isActive: { type: Boolean, default: true },
    // Tenant-specific
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
    // Supervisor-specific
    buildings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Building' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
