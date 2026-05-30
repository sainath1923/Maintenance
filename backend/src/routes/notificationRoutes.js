const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

const RECEIVER_ROLES = ['supervisor', 'technician', 'stores', 'procurement'];

// Admin sends a notification
router.post('/', auth(['admin']), ctrl.sendNotification);

// Admin views sent notifications
router.get('/sent', auth(['admin']), ctrl.getSentNotifications);

// Receivers: get their notifications
router.get('/', auth(RECEIVER_ROLES), ctrl.getNotifications);

// Receivers: mark a single notification read
router.patch('/:id/read', auth(RECEIVER_ROLES), ctrl.markRead);

// Receivers: mark all notifications read
router.patch('/read-all', auth(RECEIVER_ROLES), ctrl.markAllRead);

module.exports = router;
