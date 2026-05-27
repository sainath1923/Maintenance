const Request = require('../models/Request');
const fs = require('fs');
const path = require('path');

exports.createRequest = async (req, res) => {
  try {
    const tenantId = req.user.id;
    const data = { ...req.body, tenant: tenantId };

    if (req.files) {
      if (req.files.images && req.files.images.length > 0) {
        data.images = req.files.images.map((f) => `/uploads/request-media/${f.filename}`);
      }
      if (req.files.video && req.files.video.length > 0) {
        data.video = `/uploads/request-media/${req.files.video[0].filename}`;
      }
    }

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
    const update = { status, notes, costEstimate };
    if (status === 'Completed') {
      update.completedAt = new Date();
    }
    const request = await Request.findByIdAndUpdate(id, update, { new: true });
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

exports.uploadCompletionMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};

    if (req.files) {
      if (req.files.images && req.files.images.length > 0) {
        const newImages = req.files.images.map((f) => `/uploads/request-media/${f.filename}`);
        const existing = await Request.findById(id, 'completionImages');
        if (!existing) return res.status(404).json({ message: 'Request not found' });
        update.completionImages = [...(existing.completionImages || []), ...newImages];
      }
      if (req.files.video && req.files.video.length > 0) {
        update.completionVideo = `/uploads/request-media/${req.files.video[0].filename}`;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const updated = await Request.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Request not found' });
    res.json(updated);
  } catch (err) {
    console.error('Upload completion media error:', err.message);
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
