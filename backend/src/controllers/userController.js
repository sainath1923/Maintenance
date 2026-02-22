const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Admin: create tenant or supervisor (and optionally admin)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, apartment, buildings, isActive, technicianType } = req.body;

    if (!['tenant', 'supervisor', 'admin', 'technician'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hash,
      phone,
      role,
      technicianType: role === 'technician' ? technicianType : undefined,
      apartment: apartment || undefined,
      buildings: buildings || [],
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json({ id: user._id, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: list users (optionally filter by role)
exports.listUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin/Supervisor: list technicians only
exports.listTechnicians = async (req, res) => {
  try {
    const users = await User.find({ role: 'technician' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: activate/deactivate user
exports.setActive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
