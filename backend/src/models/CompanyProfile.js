const mongoose = require('mongoose');

const CompanyProfileSchema = new mongoose.Schema(
  {
    logoUrl: { type: String },
    name: { type: String },
    buildingName: { type: String },
    buildingAddress: { type: String },
    buildingUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanyProfile', CompanyProfileSchema);
