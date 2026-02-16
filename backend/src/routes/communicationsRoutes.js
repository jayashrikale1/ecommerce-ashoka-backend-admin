const express = require('express');
const router = express.Router();
const communicationsController = require('../controllers/communicationsController');
const authMiddleware = require('../middlewares/authMiddleware'); // Admin only

/**
 * @swagger
 * /api/communications/admin:
 *   get:
 *     summary: List communication logs (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [user, wholesaler, order]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, sms]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, failed]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: ISO date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: ISO date
 *     responses:
 *       200:
 *         description: Communication logs
 */
router.get('/admin', authMiddleware, communicationsController.getAdminLogs);

/**
 * @swagger
 * /api/communications/admin:
 *   post:
 *     summary: Create a communication log (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               entity_type: { type: string, enum: [user, wholesaler, order] }
 *               entity_id: { type: integer }
 *               channel: { type: string, enum: [email, sms] }
 *               subject: { type: string }
 *               message: { type: string }
 *               status: { type: string, enum: [sent, failed] }
 *               meta: { type: object }
 *     responses:
 *       201:
 *         description: Log created
 */
router.post('/admin', authMiddleware, communicationsController.createAdminLog);

module.exports = router;
