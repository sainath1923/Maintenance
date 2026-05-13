const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stockController = require('../controllers/stockController');

router.get('/catalog', auth(['supervisor', 'admin', 'procurement']), stockController.getStockCatalog);
router.get('/entries', auth(['supervisor', 'admin', 'technician', 'procurement']), stockController.listStockEntries);
router.post('/entries', auth(['supervisor', 'admin', 'procurement']), stockController.upsertStockEntry);
router.get('/tenants', auth(['supervisor', 'admin', 'technician']), stockController.listTenantUsers);
router.post('/requests', auth(['technician']), stockController.createStockRequest);
router.get('/requests', auth(['procurement', 'admin', 'supervisor']), stockController.listStockRequests);
router.patch('/requests/:id/approve', auth(['procurement', 'admin']), stockController.approveStockRequest);

module.exports = router;