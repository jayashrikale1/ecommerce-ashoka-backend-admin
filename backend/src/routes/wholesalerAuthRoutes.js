const express = require('express');
const router = express.Router();
const wholesalerAuthController = require('../controllers/wholesalerAuthController');

/**
 * @swagger
 * /api/wholesaler-auth/send-otp:
 *   post:
 *     summary: Send OTP for login/registration
 *     tags: [Wholesaler]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/send-otp', wholesalerAuthController.sendOtp);

/**
 * @swagger
 * /api/wholesaler-auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login/register
 *     tags: [Wholesaler]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/verify-otp', wholesalerAuthController.verifyOtp);

module.exports = router;
