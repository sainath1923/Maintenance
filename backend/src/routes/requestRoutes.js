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

const requestMediaDir = path.join(__dirname, '..', '..', 'uploads', 'request-media');
if (!fs.existsSync(requestMediaDir)) {
	fs.mkdirSync(requestMediaDir, { recursive: true });
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

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];

const requestMediaStorage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, requestMediaDir);
	},
	filename: function (req, file, cb) {
		const ext = path.extname(file.originalname) || '';
		const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_');
		cb(null, `${Date.now()}-${base}${ext}`);
	}
});

const requestMediaUpload = multer({
	storage: requestMediaStorage,
	limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB per file
	fileFilter: function (req, file, cb) {
		if (file.fieldname === 'images' && ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
			return cb(null, true);
		}
		if (file.fieldname === 'video' && ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
			return cb(null, true);
		}
		cb(new Error(`Unsupported file type: ${file.mimetype}`));
	}
});

// Tenant
router.post('/', auth(['tenant']), requestMediaUpload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), ctrl.createRequest);
router.get('/me', auth(['tenant', 'technician']), ctrl.getMyRequests);

// Supervisor
router.get('/assigned', auth(['supervisor']), ctrl.getAssignedRequests);
router.patch('/:id/status', auth(['supervisor', 'admin', 'technician']), ctrl.updateStatus);
router.patch('/:id/assign-technician', auth(['supervisor', 'admin']), ctrl.assignTechnician);

// Admin
router.get('/', auth(['admin']), ctrl.listAll);

// Technician
router.get('/technician/my', auth(['technician']), ctrl.getTechnicianRequests);
router.post('/:id/invoice', auth(['technician']), upload.single('invoice'), ctrl.uploadInvoice);
router.post('/:id/completion-media', auth(['technician']), requestMediaUpload.fields([{ name: 'images', maxCount: 5 }, { name: 'video', maxCount: 1 }]), ctrl.uploadCompletionMedia);

module.exports = router;
