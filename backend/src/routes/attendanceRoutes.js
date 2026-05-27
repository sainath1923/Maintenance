const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');

const STAFF_ROLES = ['technician', 'supervisor', 'stores', 'procurement', 'delivery'];

// Public: get configured geo-locations for all roles (needed by frontend before login context)
router.get('/locations', ctrl.getLocations);

// Admin: upsert geo-location for a role
router.put('/locations/:role', auth(['admin']), ctrl.upsertLocation);

// Authenticated staff: get today's record
router.get('/today', auth(STAFF_ROLES), ctrl.getToday);

// Authenticated staff: punch in
router.post('/punch-in', auth(STAFF_ROLES), ctrl.punchIn);

// Authenticated staff: punch out
router.post('/punch-out', auth(STAFF_ROLES), ctrl.punchOut);

// All authenticated (admin sees all, staff sees own)
router.get('/', auth(['admin', ...STAFF_ROLES]), ctrl.getAll);

module.exports = router;
