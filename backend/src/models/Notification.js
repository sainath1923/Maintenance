const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetRoles: [
      {
        type: String,
        enum: ['supervisor', 'technician', 'stores', 'procurement'],
      },
    ],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
