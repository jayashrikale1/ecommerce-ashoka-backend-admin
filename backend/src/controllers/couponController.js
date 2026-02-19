const { Coupon, Cart, CartItem } = require('../models');
const { Op } = require('sequelize');

exports.createCoupon = async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value, usage_limit, start_date, end_date, active } = req.body;
    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ message: 'code, discount_type and discount_value are required' });
    }
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value,
      min_order_value: min_order_value || 0,
      usage_limit: usage_limit || null,
      start_date: start_date || null,
      end_date: end_date || null,
      active: active !== undefined ? active : true
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCoupons = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let where = {};
    if (search) {
      where.code = { [Op.like]: `%${search.toUpperCase()}%` };
    }
    const { count, rows } = await Coupon.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });
    res.json({ coupons: rows, total: count, totalPages: Math.ceil(count / limit), currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getActiveCouponsPublic = async (req, res) => {
  try {
    const now = new Date();
    const coupons = await Coupon.findAll({
      where: {
        active: true,
        [Op.and]: [
          { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
          { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] }
        ]
      },
      order: [['created_at', 'DESC']]
    });
    res.json({ coupons });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    const { code, discount_type, discount_value, min_order_value, usage_limit, start_date, end_date, active } = req.body;
    await coupon.update({
      code: code ? code.trim().toUpperCase() : coupon.code,
      discount_type: discount_type ?? coupon.discount_type,
      discount_value: discount_value ?? coupon.discount_value,
      min_order_value: min_order_value ?? coupon.min_order_value,
      usage_limit: usage_limit ?? coupon.usage_limit,
      start_date: start_date ?? coupon.start_date,
      end_date: end_date ?? coupon.end_date,
      active: active ?? coupon.active
    });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await coupon.destroy();
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ valid: false, message: 'Coupon code is required' });

    const now = new Date();
    const coupon = await Coupon.findOne({
      where: {
        code: code.trim().toUpperCase(),
        active: true,
        [Op.and]: [
          { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
          { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] }
        ]
      }
    });
    if (!coupon) return res.status(200).json({ valid: false, message: 'Invalid or expired coupon' });
    if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
      return res.status(200).json({ valid: false, message: 'Coupon usage limit reached' });
    }

    const userId = req.user.id;
    const userType = req.userType;
    let cartWhere = {};
    if (userType === 'wholesaler') cartWhere = { wholesaler_id: userId };
    else cartWhere = { customer_id: userId };

    const cart = await Cart.findOne({
      where: cartWhere,
      include: [{ model: CartItem, as: 'items' }]
    });
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(200).json({ valid: false, message: 'Your cart is empty' });
    }

    let subtotal = 0;
    for (const item of cart.items) {
      subtotal += parseFloat(item.price) * item.quantity;
    }

    if (coupon.min_order_value && subtotal < parseFloat(coupon.min_order_value)) {
      return res.status(200).json({ valid: false, message: `Minimum order value is ₹${coupon.min_order_value}` });
    }

    let discount_amount = 0;
    if (coupon.discount_type === 'percentage') {
      discount_amount = (subtotal * parseFloat(coupon.discount_value)) / 100.0;
    } else {
      discount_amount = parseFloat(coupon.discount_value);
    }
    if (discount_amount > subtotal) discount_amount = subtotal;

    const total_after_discount = (subtotal - discount_amount).toFixed(2);

    res.status(200).json({
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discount_amount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total_after_discount
    });
  } catch (error) {
    res.status(500).json({ valid: false, message: 'Server error', error: error.message });
  }
};
