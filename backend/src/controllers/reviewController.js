const { Review, Product, User, Wholesaler } = require('../models');
const { Op, fn, col } = require('sequelize');

exports.createReview = async (req, res) => {
  try {
    const { product_id, rating, comment } = req.body;
    if (!product_id || !rating) {
      return res.status(400).json({ message: 'product_id and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'rating must be between 1 and 5' });
    }
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const userId = req.user.id;
    const userType = req.userType;
    const identity = userType === 'wholesaler' ? { wholesaler_id: userId } : { customer_id: userId };

    const existing = await Review.findOne({
      where: { product_id, ...identity }
    });
    if (existing) {
      return res.status(409).json({ message: 'Review already exists for this product' });
    }

    const review = await Review.create({
      product_id,
      rating,
      comment: comment || null,
      status: 'pending',
      ...identity
    });

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      product_id: id,
      status: { [Op.ne]: 'rejected' }
    };

    const { count, rows } = await Review.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['id', 'name', 'business_name', 'email', 'phone'] }
      ]
    });

    const aggregate = await Review.findOne({
      where: whereClause,
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
    });

    const avgRaw = aggregate && aggregate.get('avgRating');
    const averageRating = avgRaw !== null && avgRaw !== undefined ? Number(avgRaw) : null;

    res.status(200).json({
      reviews: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalReviews: count,
      averageRating,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAdminReviews = async (req, res) => {
  try {
    const { status, productId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (productId) where.product_id = productId;

    const { count, rows } = await Review.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name'] },
        { model: User, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['id', 'business_name', 'email'] }
      ]
    });

    res.status(200).json({
      reviews: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalReviews: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    review.status = status;
    await review.save();
    res.status(200).json({ message: 'Status updated', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    await review.destroy();
    res.status(200).json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
