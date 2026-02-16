const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const cartAuthMiddleware = require('../middlewares/cartAuthMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', cartAuthMiddleware, reviewController.createReview);
router.get('/product/:id', reviewController.getProductReviews);

router.get('/admin', authMiddleware, reviewController.getAdminReviews);
router.put('/admin/:id/status', authMiddleware, reviewController.updateReviewStatus);
router.delete('/admin/:id', authMiddleware, reviewController.deleteReview);

module.exports = router;
