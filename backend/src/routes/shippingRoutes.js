const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/admin/:orderId/create', authMiddleware, shippingController.createShipment);
router.get('/admin/track/:tracking', authMiddleware, shippingController.getShipment);
router.get('/admin/by-order/:orderId', authMiddleware, shippingController.listByOrder);
router.post('/webhook', shippingController.webhook);

module.exports = router;
