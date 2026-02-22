const mongoose = require('mongoose');

const BuildingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: String
  },
  { timestamps: true }
);

const FloorSchema = new mongoose.Schema(
  {
    building: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    name: { type: String, required: true }
  },
  { timestamps: true }
);

const ApartmentSchema = new mongoose.Schema(
  {
    floor: { type: mongoose.Schema.Types.ObjectId, ref: 'Floor', required: true },
    number: { type: String, required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = {
  Building: mongoose.model('Building', BuildingSchema),
  Floor: mongoose.model('Floor', FloorSchema),
  Apartment: mongoose.model('Apartment', ApartmentSchema)
};
