const Attendance = require('../models/Attendance');
const AttendanceLocation = require('../models/AttendanceLocation');

const ROLES = ['technician', 'supervisor', 'stores', 'procurement', 'delivery'];

// Haversine formula – returns distance in metres between two lat/lng points
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

// GET /api/attendance/locations  – public, returns all role locations
exports.getLocations = async (req, res) => {
  try {
    const locations = await AttendanceLocation.find({});
    const map = {};
    for (const loc of locations) {
      map[loc.role] = { lat: loc.lat, lng: loc.lng, radius: loc.radius };
    }
    res.json(map);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/attendance/locations/:role  – admin only
exports.upsertLocation = async (req, res) => {
  try {
    const { role } = req.params;
    if (!ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const { lat, lng, radius } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'lat and lng are required' });
    }
    const updated = await AttendanceLocation.findOneAndUpdate(
      { role },
      { lat: Number(lat), lng: Number(lng), radius: radius != null ? Number(radius) : 50 },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ role: updated.role, lat: updated.lat, lng: updated.lng, radius: updated.radius });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/attendance/today  – returns today's record for the current user
exports.getToday = async (req, res) => {
  try {
    const date = todayString();
    const record = await Attendance.findOne({ user: req.user.id, date });
    res.json(
      record
        ? {
            date: record.date,
            punchIn: record.punchIn,
            punchOut: record.punchOut
          }
        : { date, punchIn: null, punchOut: null }
    );
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/attendance/punch-in
exports.punchIn = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'Geolocation is required' });
    }

    const role = req.user.role;
    const locationConfig = await AttendanceLocation.findOne({ role });
    if (!locationConfig || locationConfig.lat == null || locationConfig.lng == null) {
      return res.status(400).json({
        message: 'Attendance location has not been configured for your role. Contact admin.'
      });
    }

    const dist = haversineDistance(lat, lng, locationConfig.lat, locationConfig.lng);
    const radius = locationConfig.radius || 50;
    if (dist > radius) {
      return res.status(400).json({
        message: 'You are away from the allowed location.'
      });
    }

    const date = todayString();
    const existing = await Attendance.findOne({ user: req.user.id, date });
    if (existing && existing.punchIn) {
      return res.status(400).json({ message: 'Already punched in today.' });
    }

    const now = new Date();
    const record = await Attendance.findOneAndUpdate(
      { user: req.user.id, date },
      { $set: { role, punchIn: now, punchInLocation: { lat: Number(lat), lng: Number(lng) } } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Punched in successfully', punchIn: record.punchIn });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/attendance/punch-out
exports.punchOut = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat == null || lng == null) {
      return res.status(400).json({ message: 'Geolocation is required' });
    }

    const role = req.user.role;
    const locationConfig = await AttendanceLocation.findOne({ role });
    if (!locationConfig || locationConfig.lat == null || locationConfig.lng == null) {
      return res.status(400).json({
        message: 'Attendance location has not been configured for your role. Contact admin.'
      });
    }

    const dist = haversineDistance(lat, lng, locationConfig.lat, locationConfig.lng);
    const radius = locationConfig.radius || 50;
    if (dist > radius) {
      return res.status(400).json({
        message: 'You are away from the allowed location.'
      });
    }

    const date = todayString();
    const record = await Attendance.findOne({ user: req.user.id, date });
    if (!record || !record.punchIn) {
      return res.status(400).json({ message: 'You have not punched in today.' });
    }
    if (record.punchOut) {
      return res.status(400).json({ message: 'Already punched out today.' });
    }

    record.punchOut = new Date();
    record.punchOutLocation = { lat: Number(lat), lng: Number(lng) };
    await record.save();

    res.json({ message: 'Punched out successfully', punchOut: record.punchOut });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/attendance  – admin: all records with user details; others: own records
exports.getAll = async (req, res) => {
  try {
    let records;
    if (req.user.role === 'admin') {
      records = await Attendance.find({}).populate('user', 'name email role').sort({ date: -1 });
    } else {
      records = await Attendance.find({ user: req.user.id }).sort({ date: -1 });
    }
    res.json(records);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
