const Notification = require('../models/Notification');

const VALID_ROLES = ['supervisor', 'technician', 'stores', 'procurement'];

// POST /api/notifications  — admin only
exports.sendNotification = async (req, res) => {
  try {
    const { message, targetRoles } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const roles = Array.isArray(targetRoles)
      ? targetRoles.filter((r) => VALID_ROLES.includes(r))
      : [];

    if (roles.length === 0) {
      return res.status(400).json({ message: 'Select at least one target role' });
    }

    const notification = await Notification.create({
      message: message.trim(),
      sender: req.user.id,
      targetRoles: roles,
    });

    res.status(201).json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/notifications  — any authenticated non-admin role
exports.getNotifications = async (req, res) => {
  try {
    const role = req.user.role;
    const notifications = await Notification.find({ targetRoles: role })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name');

    const result = notifications.map((n) => ({
      _id: n._id,
      message: n.message,
      senderName: n.sender?.name || 'Admin',
      targetRoles: n.targetRoles,
      read: n.readBy.some((id) => id.toString() === req.user.id),
      createdAt: n.createdAt,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/notifications/sent  — admin only: list sent notifications
exports.getSentNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ sender: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/notifications/:id/read  — mark as read for current user
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    const role = req.user.role;
    if (!notification.targetRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!notification.readBy.some((id) => id.toString() === req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/notifications/read-all  — mark all as read for current user
exports.markAllRead = async (req, res) => {
  try {
    const role = req.user.role;
    await Notification.updateMany(
      { targetRoles: role, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
