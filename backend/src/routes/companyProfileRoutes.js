const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/companyProfileController');

// Public: anyone can read the company profile (logo + address)
router.get('/', ctrl.getProfile);

// Admin-only: create or update the company profile
router.put('/', auth(['admin']), ctrl.upsertProfile);

module.exports = router;
