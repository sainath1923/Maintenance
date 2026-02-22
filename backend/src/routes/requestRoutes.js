const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/requestController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const invoicesDir = path.join(__dirname, '..', '..', 'uploads', 'invoices');
if (!fs.existsSync(invoicesDir)) {
	fs.mkdirSync(invoicesDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, invoicesDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname) || '';
		const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
		cb(null, `${base}-${Date.now()}${ext}`);
	}
});

const upload = multer({ storage });

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
router.post('/:id/invoice', auth(['technician']), upload.single('invoice'), ctrl.uploadInvoice);

module.exports = router;
