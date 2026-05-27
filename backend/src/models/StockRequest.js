const mongoose = require('mongoose');

const StockRequestSchema = new mongoose.Schema(
  {
    stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
    category: { type: String, required: true, trim: true },
    item: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenantFlatNumber: { type: String, default: '' },
    tenantBlock: { type: String, default: '' },
    buildingName: { type: String, default: '' },
    maintenanceRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
    comments: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    supervisorApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    supervisorApprovedAt: { type: Date },
    procurementForwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    procurementForwardedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    deliveredAt: { type: Date },
    pickedUp: { type: Boolean, default: false },
    pickedUpAt: { type: Date },
    deliveredTo: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'SupervisorApproved', 'SupervisorRejected', 'ProcurementRequested', 'Approved', 'Dispatched', 'Delivered', 'Rejected'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockRequest', StockRequestSchema);
