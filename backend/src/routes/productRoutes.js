const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const cartAuthMiddleware = require('../middlewares/cartAuthMiddleware');

// Configure upload to handle multiple fields
const cpUpload = upload.fields([
    { name: 'main_image', maxCount: 1 }, 
    { name: 'images', maxCount: 10 }
]);

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         category_id:
 *           type: integer
 *         product_name:
 *           type: string
 *         slug:
 *           type: string
 *         brand:
 *           type: string
 *         short_description:
 *           type: string
 *         full_description:
 *           type: string
 *         uses:
 *           type: string
 *         material:
 *           type: string
 *         country_of_origin:
 *           type: string
 *         mrp_price:
 *           type: number
 *         selling_price:
 *           type: number
 *         doctor_price:
 *           type: number
 *         gst_applicable:
 *           type: boolean
 *         has_variant:
 *           type: boolean
 *         variant_name:
 *           type: string
 *         variant_values:
 *           type: string
 *         specifications_json:
 *           type: object
 *         stock_quantity:
 *           type: integer
 *         home_delivery:
 *           type: boolean
 *         main_image:
 *           type: string
 *         status:
 *           type: boolean
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - product_name
 *             properties:
 *               category_id:
 *                 type: integer
 *               product_name:
 *                 type: string
 *               slug:
 *                 type: string
 *               brand:
 *                 type: string
 *               short_description:
 *                 type: string
 *               full_description:
 *                 type: string
 *               uses:
 *                 type: string
 *               material:
 *                 type: string
 *               country_of_origin:
 *                 type: string
 *               mrp_price:
 *                 type: number
 *               selling_price:
 *                 type: number
 *               doctor_price:
 *                 type: number
 *               has_variant:
 *                 type: boolean
 *               variant_name:
 *                 type: string
 *               variant_values:
 *                 type: string
 *               specifications_json:
 *                 type: string
 *                 description: JSON string
 *               stock_quantity:
 *                 type: integer
 *               home_delivery:
 *                 type: boolean
 *               status:
 *                 type: boolean
 *               main_image:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authMiddleware, cpUpload, productController.createProduct);

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [User, Wholesaler]
 *     responses:
 *       200:
 *         description: List of products
 *       500:
 *         description: Server error
 */
router.get('/', productController.getAllProducts);

// Role-aware pricing endpoints (require customer/wholesaler auth)
router.get('/priced', cartAuthMiddleware, productController.getAllProductsPriced);
router.get('/:id/priced', cartAuthMiddleware, productController.getProductByIdPriced);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [User, Wholesaler]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.get('/:id', productController.getProductById);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: integer
 *               product_name:
 *                 type: string
 *               slug:
 *                 type: string
 *               brand:
 *                 type: string
 *               short_description:
 *                 type: string
 *               full_description:
 *                 type: string
 *               uses:
 *                 type: string
 *               material:
 *                 type: string
 *               country_of_origin:
 *                 type: string
 *               mrp_price:
 *                 type: number
 *               selling_price:
 *                 type: number
 *               doctor_price:
 *                 type: number
 *               has_variant:
 *                 type: boolean
 *               variant_name:
 *                 type: string
 *               variant_values:
 *                 type: string
 *               specifications_json:
 *                 type: string
 *               stock_quantity:
 *                 type: integer
 *               home_delivery:
 *                 type: boolean
 *               status:
 *                 type: boolean
 *               main_image:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.put('/:id', authMiddleware, cpUpload, productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
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
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', authMiddleware, productController.deleteProduct);
router.delete('/images/:id', authMiddleware, productController.deleteProductImage);

module.exports = router;
