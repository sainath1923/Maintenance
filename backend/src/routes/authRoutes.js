const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/login', authCtrl.login);
router.post('/register-tenant', authCtrl.registerTenant); // optional, can be disabled in production

module.exports = router;
