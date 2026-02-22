const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

// technicians can be viewed by supervisors and admins
router.get('/technicians', auth(['supervisor', 'admin']), ctrl.listTechnicians);

// all other user management is admin-only
router.use(auth(['admin']));

router.post('/', ctrl.createUser);
router.get('/', ctrl.listUsers);
router.patch('/:id/active', ctrl.setActive);

module.exports = router;
