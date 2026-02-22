const CompanyProfile = require('../models/CompanyProfile');

exports.getProfile = async (req, res) => {
  try {
    const profile = await CompanyProfile.findOne({});
    if (!profile) {
      return res.json({
        logoUrl: '',
        name: '',
        buildingName: '',
        buildingAddress: '',
        buildingUrl: ''
      });
    }
    res.json({
      logoUrl: profile.logoUrl || '',
      name: profile.name || '',
      buildingName: profile.buildingName || '',
      buildingAddress: profile.buildingAddress || '',
      buildingUrl: profile.buildingUrl || ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.upsertProfile = async (req, res) => {
  try {
    const { logoUrl, name, buildingName, buildingAddress, buildingUrl } = req.body;

    const updated = await CompanyProfile.findOneAndUpdate(
      {},
      { logoUrl, name, buildingName, buildingAddress, buildingUrl },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      logoUrl: updated.logoUrl || '',
      name: updated.name || '',
      buildingName: updated.buildingName || '',
      buildingAddress: updated.buildingAddress || '',
      buildingUrl: updated.buildingUrl || ''
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
