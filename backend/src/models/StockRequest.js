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
    comments: { type: String, default: '' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockRequest', StockRequestSchema);
