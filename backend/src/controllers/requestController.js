const Request = require('../models/Request');
const fs = require('fs');
const path = require('path');

exports.createRequest = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const data = { ...req.body, tenant: tenantId };
    const request = await Request.create(data);
    res.status(201).json(request);
  } catch (err) {
    console.error('Create request error:', err.message);
    // Surface validation or bad input as 400, everything else as 500
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const requests = await Request.find({ tenant: tenantId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignedRequests = async (req, res) => {
  try {
    const supervisorId = req.user.id;
    // For now, show both requests explicitly assigned to this supervisor
    // and any unassigned requests so new tickets are visible.
    const requests = await Request.find({
      $or: [{ supervisor: supervisorId }, { supervisor: null }]
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, costEstimate } = req.body;
    const request = await Request.findByIdAndUpdate(
      id,
      { status, notes, costEstimate },
      { new: true }
    );
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;
    const request = await Request.findByIdAndUpdate(
      id,
      { technician: technicianId },
      { new: true }
    ).lean();
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTechnicianRequests = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const requests = await Request.find({ technician: technicianId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listAll = async (req, res) => {
  try {
    const requests = await Request.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ message: 'No invoice file uploaded' });
    }

    const relativePath = `/uploads/invoices/${req.file.filename}`;

    const request = await Request.findByIdAndUpdate(
      id,
      { invoiceUrl: relativePath },
      { new: true }
    );

    if (!request) {
      // Clean up file if request not found
      fs.unlink(path.join(__dirname, '..', '..', relativePath), () => {});
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (err) {
    console.error('Upload invoice error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
