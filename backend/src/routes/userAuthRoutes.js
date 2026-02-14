const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/userAuthController');

/**
 * @swagger
 * /api/user-auth/send-otp:
 *   post:
 *     summary: Send OTP to email or phone
 *     tags: [User]
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
router.post('/send-otp', userAuthController.sendOtp);

/**
 * @swagger
 * /api/user-auth/verify-otp:
 *   post:
 *     summary: Verify OTP and Login/Register
 *     tags: [User]
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
router.post('/verify-otp', userAuthController.verifyOtp);

module.exports = router;
