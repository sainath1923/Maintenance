const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stockController = require('../controllers/stockController');

router.get('/catalog', auth(['supervisor', 'admin', 'procurement', 'stores']), stockController.getStockCatalog);
router.get('/entries', auth(['supervisor', 'admin', 'technician', 'procurement', 'stores']), stockController.listStockEntries);
router.post('/entries', auth(['supervisor', 'admin', 'procurement', 'stores']), stockController.upsertStockEntry);
router.delete('/entries/:id', auth(['stores', 'admin']), stockController.deleteStockEntry);
router.patch('/entries/:id/batches/:batchId', auth(['stores', 'admin']), stockController.updateBatch);
router.delete('/entries/:id/batches/:batchId', auth(['stores', 'admin']), stockController.deleteBatch);
router.get('/tenants', auth(['supervisor', 'admin', 'technician', 'stores']), stockController.listTenantUsers);
router.post('/requests', auth(['technician', 'stores']), stockController.createStockRequest);
router.get('/requests', auth(['procurement', 'admin', 'supervisor', 'stores', 'technician', 'delivery']), stockController.listStockRequests);
router.patch('/requests/:id/supervisor-approve', auth(['supervisor', 'admin']), stockController.supervisorApproveRequest);
router.patch('/requests/:id/procurement-forward', auth(['procurement', 'admin']), stockController.procurementForwardRequest);
router.patch('/requests/:id/approve', auth(['stores', 'admin']), stockController.approveStockRequest);
router.get('/delivery-persons', auth(['stores', 'admin']), stockController.listDeliveryPersons);
router.patch('/requests/:id/assign-delivery', auth(['stores', 'admin']), stockController.assignDelivery);
router.patch('/requests/:id/toggle-picked-up', auth(['delivery', 'admin']), stockController.togglePickedUp);
router.patch('/requests/:id/toggle-delivered', auth(['delivery', 'admin']), stockController.toggleDelivered);
router.patch('/requests/:id/delivered-to', auth(['delivery', 'admin']), stockController.updateDeliveredTo);

module.exports = router;