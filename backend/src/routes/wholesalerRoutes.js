const express = require('express');
const router = express.Router();
const wholesalerController = require('../controllers/wholesalerController');
const wholesalerMiddleware = require('../middlewares/wholesalerMiddleware');
const authMiddleware = require('../middlewares/authMiddleware'); // Admin middleware

// --- Wholesaler Personal Routes ---

/**
 * @swagger
 * /api/wholesalers/profile:
 *   get:
 *     summary: Get current wholesaler profile
 *     tags: [Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wholesaler profile
 */
router.get('/profile', wholesalerMiddleware, wholesalerController.getProfile);

/**
 * @swagger
 * /api/wholesalers/profile:
 *   put:
 *     summary: Update wholesaler profile
 *     tags: [Wholesaler]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               business_name:
 *                 type: string
 *               gst_number:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', wholesalerMiddleware, wholesalerController.updateProfile);

// --- Admin Routes ---

/**
 * @swagger
 * /api/wholesalers:
 *   get:
 *     summary: List all wholesalers (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of wholesalers
 */
router.get('/', authMiddleware, wholesalerController.getAllWholesalers);
router.get('/admin/export', authMiddleware, wholesalerController.exportWholesalersCsv);

/**
 * @swagger
 * /api/wholesalers/{id}/status:
 *   put:
 *     summary: Update wholesaler status (Approve/Reject)
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, blocked, pending]
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id/status', authMiddleware, wholesalerController.updateWholesalerStatus);

module.exports = router;
