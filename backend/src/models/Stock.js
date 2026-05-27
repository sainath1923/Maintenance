const mongoose = require('mongoose');

const StockSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    item: { type: String, required: true, trim: true },
    isAvailable: { type: Boolean, required: true },
    quantity: { type: Number, default: 0, min: 0 },
    price: { type: Number, default: 0, min: 0 },
    updatedOn: { type: Date, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    batches: [
      {
        batchNumber: { type: String, trim: true, default: '' },
        quantity: { type: Number, required: true, min: 0 },
        addedOn: { type: Date, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

StockSchema.index({ category: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('Stock', StockSchema);
