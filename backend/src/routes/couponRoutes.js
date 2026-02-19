const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authMiddleware = require('../middlewares/authMiddleware');
const cartAuthMiddleware = require('../middlewares/cartAuthMiddleware');

router.get('/public/active', couponController.getActiveCouponsPublic);

/**
 * Admin: Create coupon
 */
router.post('/', authMiddleware, couponController.createCoupon);

/**
 * Admin: List coupons
 */
router.get('/', authMiddleware, couponController.getCoupons);

/**
 * Admin: Update coupon
 */
router.put('/:id', authMiddleware, couponController.updateCoupon);

/**
 * Admin: Delete coupon
 */
router.delete('/:id', authMiddleware, couponController.deleteCoupon);

/**
 * User/Wholesaler: Validate coupon against current cart
 */
router.post('/validate', cartAuthMiddleware, couponController.validateCoupon);

module.exports = router;
