const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         category_name:
 *           type: string
 *         slug:
 *           type: string
 *         parent_id:
 *           type: integer
 *         status:
 *           type: boolean
 */

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_name
 *             properties:
 *               category_name:
 *                 type: string
 *               slug:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               status:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created successfully
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, upload.single('image'), categoryController.createCategory);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories
 *     tags: [User, Wholesaler]
 *     responses:
 *       200:
 *         description: List of categories
 *       500:
 *         description: Server error
 */
router.get('/', categoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [User, Wholesaler]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.get('/:id', categoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update a category
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category_name:
 *                 type: string
 *               slug:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, upload.single('image'), categoryController.updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Admin]
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
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, categoryController.deleteCategory);

module.exports = router;
