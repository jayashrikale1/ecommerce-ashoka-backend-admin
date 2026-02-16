const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const cartAuthMiddleware = require('../middlewares/cartAuthMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Payment
 *   description: Payment Gateway Integration (Razorpay)
 */

/**
 * @swagger
 * /api/payment/create-order:
 *   post:
 *     summary: Create Razorpay Order (and local Order)
 *     tags: [Payment, User, Wholesaler]
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
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Razorpay order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 order_id:
 *                   type: integer
 *                 razorpay_order_id:
 *                   type: string
 *                 amount:
 *                   type: integer
 *                 currency:
 *                   type: string
 *                 key_id:
 *                   type: string
 *       400:
 *         description: Bad request (empty cart, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post('/create-order', cartAuthMiddleware, paymentController.createRazorpayOrder);

/**
 * @swagger
 * /api/payment/verify:
 *   post:
 *     summary: Verify Razorpay Payment Signature
 *     tags: [Payment, User, Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *               - order_id
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *               order_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Payment verified
 *       400:
 *         description: Invalid signature
 *       404:
 *         description: Order not found
 */
router.post('/verify', cartAuthMiddleware, paymentController.verifyPayment);

// Admin refund endpoint
router.post('/refund/:orderId', authMiddleware, paymentController.refundPayment);

module.exports = router;
