const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const cartAuthMiddleware = require('../middlewares/cartAuthMiddleware'); // User/Wholesaler Auth
const authMiddleware = require('../middlewares/authMiddleware'); // Admin Auth

// --- User/Wholesaler Routes ---

/**
 * @swagger
 * /api/orders/place:
 *   post:
 *     summary: Place an order from cart
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipping_address
 *             properties:
 *               shipping_address:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 default: cod
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Invalid input or empty cart
 *       401:
 *         description: Unauthorized
 */
router.post('/place', cartAuthMiddleware, orderController.placeOrder);

/**
 * @swagger
 * /api/orders/instant:
 *   post:
 *     summary: Place a single product instant purchase order
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *               - shipping_address
 *             properties:
 *               product_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               shipping_address:
 *                 type: string
 *               payment_method:
 *                 type: string
 *                 default: cod
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order placed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/instant', cartAuthMiddleware, orderController.instantPurchase);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get my order history
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [recent, history]
 *     responses:
 *       200:
 *         description: List of orders
 *       401:
 *         description: Unauthorized
 */
router.get('/', cartAuthMiddleware, orderController.getMyOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order details
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', cartAuthMiddleware, orderController.getOrderDetails);

/**
 * @swagger
 * /api/orders/{id}/invoice:
 *   get:
 *     summary: Get invoice HTML for my order
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invoice HTML
 *       400:
 *         description: Invoice not available
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.get('/:id/invoice', cartAuthMiddleware, orderController.getOrderInvoice);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel my order
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Cannot cancel order
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.post('/:id/cancel', cartAuthMiddleware, orderController.cancelMyOrder);

// --- Admin Routes ---

/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Get all orders (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, shipped, delivered, cancelled]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [customer, wholesaler]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of all orders
 *       403:
 *         description: Admin access required
 */
router.get('/admin/all', authMiddleware, orderController.getAllOrders);

/**
 * @swagger
 * /api/orders/admin/{id}/status:
 *   put:
 *     summary: Update order status (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Admin access required
 */
router.put('/admin/:id/status', authMiddleware, orderController.updateOrderStatus);
router.get('/admin/:id/invoice', authMiddleware, orderController.getOrderInvoice);

module.exports = router;
