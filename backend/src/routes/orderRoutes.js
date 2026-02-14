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
 * /api/orders:
 *   get:
 *     summary: Get my order history
 *     tags: [User, Wholesaler]
 *     security:
 *       - bearerAuth: []
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

module.exports = router;
