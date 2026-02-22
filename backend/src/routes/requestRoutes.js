const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/requestController');

// Tenant
router.post('/', auth(['tenant']), ctrl.createRequest);
router.get('/me', auth(['tenant']), ctrl.getMyRequests);

// Supervisor
router.get('/assigned', auth(['supervisor']), ctrl.getAssignedRequests);
router.patch('/:id/status', auth(['supervisor', 'admin', 'technician']), ctrl.updateStatus);
router.patch('/:id/assign-technician', auth(['supervisor', 'admin']), ctrl.assignTechnician);

// Admin
router.get('/', auth(['admin']), ctrl.listAll);

// Technician
router.get('/technician/my', auth(['technician']), ctrl.getTechnicianRequests);

module.exports = router;
