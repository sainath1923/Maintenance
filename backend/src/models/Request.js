const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema(
  {
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    block: { type: String },
    flatNumber: { type: String },
    mobileNumber: { type: String, required: true },
    requestType: { type: String, enum: ['maintenance', 'request'], default: 'request' },
    maintenanceCategory: { type: String },
    title: { type: String, required: true },
    description: String,
    images: [String],
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Emergency'], default: 'Low' },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Waiting for Parts', 'Rejected', 'Completed'],
      default: 'Pending'
    },
    locationDetails: String,
    preferredVisitTime: Date,
    preferredVisitSlot: {
      type: String,
      enum: ['Any time', '7am to 1pm', '1pm to 7pm'],
      default: 'Any time'
    },
    notes: String,
    completionReport: String,
    completionImages: [String],
    invoiceUrl: String,
    costEstimate: Number,
    costActual: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', RequestSchema);
