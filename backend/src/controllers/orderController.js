const { Order, OrderItem, Cart, CartItem, Product, ProductImage, User, Wholesaler } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

exports.placeOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const userType = req.userType;
    const { shipping_address, payment_method, notes } = req.body;

    if (!shipping_address) {
      await t.rollback();
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    // Get Cart
    let cartWhere = {};
    if (userType === 'wholesaler') {
      cartWhere = { wholesaler_id: userId };
    } else {
      cartWhere = { customer_id: userId };
    }

    const cart = await Cart.findOne({
      where: cartWhere,
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      transaction: t
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Calculate total and validate stock
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          message: `Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}` 
        });
      }

      // Deduct stock
      await item.product.decrement('stock', { by: item.quantity, transaction: t });

      const itemTotal = parseFloat(item.price) * item.quantity;
      totalAmount += itemTotal;

      orderItemsData.push({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Create Order
    const orderData = {
      total_amount: totalAmount,
      shipping_address,
      payment_method: payment_method || 'cod',
      status: 'pending',
      notes
    };

    if (userType === 'wholesaler') {
      orderData.wholesaler_id = userId;
    } else {
      orderData.customer_id = userId;
    }

    const order = await Order.create(orderData, { transaction: t });

    // Create Order Items
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        ...itemData,
        order_id: order.id
      }, { transaction: t });
    }

    // Clear Cart
    await CartItem.destroy({
      where: { cart_id: cart.id },
      transaction: t
    });

    await t.commit();

    res.status(201).json({ message: 'Order placed successfully', orderId: order.id });

  } catch (error) {
    await t.rollback();
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;

    let whereClause = {};
    if (userType === 'wholesaler') {
      whereClause = { wholesaler_id: userId };
    } else {
      whereClause = { customer_id: userId };
    }

    const orders = await Order.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: OrderItem,
          as: 'items'
        }
      ]
    });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.userType;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    let isAuthorized = false;
    if (userType === 'wholesaler' && order.wholesaler_id === userId) isAuthorized = true;
    if (userType === 'customer' && order.customer_id === userId) isAuthorized = true;
    
    // Allow admin (if we use this controller for admin too, but let's keep it strict here or check for admin role if we unify)
    // For now, let's assume this endpoint is for users/wholesalers. Admin has separate endpoints usually.
    // But if we want to reuse:
    // if (req.admin) isAuthorized = true; 

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin Controllers
exports.getAllOrders = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10, userId, wholesalerId } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (status) {
      whereClause.status = status;
    }

    if (userId) {
        whereClause.customer_id = userId;
    } else if (wholesalerId) {
        whereClause.wholesaler_id = wholesalerId;
    } else {
        if (type === 'customer') {
            whereClause.customer_id = { [Op.ne]: null };
        } else if (type === 'wholesaler') {
            whereClause.wholesaler_id = { [Op.ne]: null };
        }
    }

    const { count, rows } = await Order.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['id', 'name', 'business_name', 'email', 'phone'] },
        { model: OrderItem, as: 'items', attributes: ['id', 'product_name', 'quantity', 'price'] }
      ]
    });

    res.status(200).json({
      orders: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      totalOrders: count
    });
  } catch (error) {
    console.error('Admin get all orders error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
