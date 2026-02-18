const { Order, OrderItem, Cart, CartItem, Product, ProductImage, User, Wholesaler, Coupon } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

exports.placeOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const userType = req.userType;
    const { shipping_address, payment_method, notes, coupon_code } = req.body;

    if (!shipping_address) {
      await t.rollback();
      return res.status(400).json({ message: 'Shipping address is required' });
    }

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

    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({
          message: `Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}`
        });
      }

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

    let discountAmount = 0;
    let appliedCoupon = null;
    if (coupon_code) {
      const now = new Date();
      const coupon = await Coupon.findOne({
        where: {
          code: coupon_code.trim().toUpperCase(),
          active: true,
          [Op.and]: [
            { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
            { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] }
          ]
        },
        transaction: t
      });
      if (coupon) {
        if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        } else if (coupon.min_order_value && totalAmount < parseFloat(coupon.min_order_value)) {
        } else {
          if (coupon.discount_type === 'percentage') {
            discountAmount = (totalAmount * parseFloat(coupon.discount_value)) / 100.0;
          } else {
            discountAmount = parseFloat(coupon.discount_value);
          }
          if (discountAmount > totalAmount) discountAmount = totalAmount;
          appliedCoupon = coupon;
        }
      }
    }

    const orderData = {
      total_amount: totalAmount - discountAmount,
      shipping_address,
      payment_method: payment_method || 'cod',
      status: 'pending',
      notes
    };

    if (appliedCoupon) {
      orderData.coupon_code = appliedCoupon.code;
      orderData.discount_amount = discountAmount;
    }

    if (userType === 'wholesaler') {
      orderData.wholesaler_id = userId;
    } else {
      orderData.customer_id = userId;
    }

    const order = await Order.create(orderData, { transaction: t });

    for (const itemData of orderItemsData) {
      await OrderItem.create(
        {
          ...itemData,
          order_id: order.id
        },
        { transaction: t }
      );
    }

    await CartItem.destroy({
      where: { cart_id: cart.id },
      transaction: t
    });

    if (appliedCoupon) {
      await appliedCoupon.increment('used_count', { by: 1, transaction: t });
    }

    await t.commit();

    res.status(201).json({ message: 'Order placed successfully', orderId: order.id });
  } catch (error) {
    await t.rollback();
    console.error('Place order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.instantPurchase = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const userType = req.userType;
    const { product_id, quantity, shipping_address, payment_method, notes, coupon_code } = req.body;

    if (!product_id || !quantity) {
      await t.rollback();
      return res.status(400).json({ message: 'Product ID and quantity are required' });
    }

    if (!shipping_address) {
      await t.rollback();
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    const product = await Product.findByPk(product_id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty) || qty <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Quantity must be a positive integer' });
    }

    if (product.stock < qty) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: `Insufficient stock. Available: ${product.stock}` });
    }

    let price = 0;
    if (userType === 'wholesaler') {
      price = product.wholesaler_price;
    } else {
      price = product.customer_price;
    }

    const numericPrice = parseFloat(price || 0);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      await t.rollback();
      return res.status(400).json({ message: 'Product price is not available' });
    }

    const totalAmountRaw = numericPrice * qty;

    let discountAmount = 0;
    let appliedCoupon = null;
    if (coupon_code) {
      const now = new Date();
      const coupon = await Coupon.findOne({
        where: {
          code: coupon_code.trim().toUpperCase(),
          active: true,
          [Op.and]: [
            { [Op.or]: [{ start_date: null }, { start_date: { [Op.lte]: now } }] },
            { [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }] }
          ]
        },
        transaction: t
      });
      if (coupon) {
        if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
        } else if (coupon.min_order_value && totalAmountRaw < parseFloat(coupon.min_order_value)) {
        } else {
          if (coupon.discount_type === 'percentage') {
            discountAmount = (totalAmountRaw * parseFloat(coupon.discount_value)) / 100.0;
          } else {
            discountAmount = parseFloat(coupon.discount_value);
          }
          if (discountAmount > totalAmountRaw) discountAmount = totalAmountRaw;
          appliedCoupon = coupon;
        }
      }
    }

    const finalAmount = totalAmountRaw - discountAmount;

    await product.decrement('stock', { by: qty, transaction: t });

    const orderData = {
      total_amount: finalAmount,
      shipping_address,
      payment_method: payment_method || 'cod',
      status: 'pending',
      notes
    };

    if (appliedCoupon) {
      orderData.coupon_code = appliedCoupon.code;
      orderData.discount_amount = discountAmount;
    }

    if (userType === 'wholesaler') {
      orderData.wholesaler_id = userId;
    } else {
      orderData.customer_id = userId;
    }

    const order = await Order.create(orderData, { transaction: t });

    await OrderItem.create(
      {
        order_id: order.id,
        product_id: product.id,
        product_name: product.name,
        quantity: qty,
        price: numericPrice
      },
      { transaction: t }
    );

    if (appliedCoupon) {
      await appliedCoupon.increment('used_count', { by: 1, transaction: t });
    }

    await t.commit();

    res.status(201).json({ message: 'Order placed successfully', orderId: order.id });
  } catch (error) {
    await t.rollback();
    console.error('Instant purchase error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.userType;
    const { scope } = req.query;

    let whereClause = {};
    if (userType === 'wholesaler') {
      whereClause = { wholesaler_id: userId };
    } else {
      whereClause = { customer_id: userId };
    }

    if (scope === 'recent') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.created_at = { [Op.gte]: thirtyDaysAgo };
    }

    const orders = await Order.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }]
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

exports.getOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }]
        },
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['id', 'business_name', 'email', 'phone'] }
      ]
    });
    if (!order) {
      return res.status(404).send('Order not found');
    }

    let isAuthorized = false;
    if (req.admin) {
      isAuthorized = true;
    }
    if (req.user && req.userType === 'wholesaler' && order.wholesaler_id === req.user.id) {
      isAuthorized = true;
    }
    if (req.user && req.userType === 'customer' && order.customer_id === req.user.id) {
      isAuthorized = true;
    }
    if (!isAuthorized) {
      return res.status(403).send('Access denied');
    }

    if (order.status !== 'delivered') {
      return res.status(400).send('Invoice available only after delivery');
    }

    const titleName = order.customer
      ? order.customer.name
      : order.wholesaler
        ? order.wholesaler.business_name
        : 'Customer';
    const identity = order.customer ? 'Customer' : 'Wholesaler';
    const subtotal = Number(order.total_amount || 0) + Number(order.discount_amount || 0);
    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_amount || 0);
    const dateStr = new Date(order.created_at).toLocaleString();

    const buildImageUrl = (imagePath) => {
      if (!imagePath) return null;
      if (typeof imagePath !== 'string') return null;
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return normalizedPath;
    };

    const rows = (order.items || [])
      .map((it) => {
        let imageUrl = null;
        if (it.product && Array.isArray(it.product.images) && it.product.images.length > 0) {
          const primaryImage = it.product.images.find((img) => img.is_primary) || it.product.images[0];
          if (primaryImage && primaryImage.image_url) {
            imageUrl = buildImageUrl(primaryImage.image_url);
          }
        }
        const imageMarkup = imageUrl
          ? `<img src="${imageUrl}" alt="${it.product_name}" style="width:40px;height:40px;object-fit:cover;margin-right:8px;border-radius:4px;border:1px solid #eee;" />`
          : '';
        return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${imageMarkup}
            <span>${it.product_name}</span>
          </div>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(it.price).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${(Number(it.price) * it.quantity).toFixed(2)}</td>
      </tr>
    `;
      })
      .join('');

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.id}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #222; }
      .container { max-width: 900px; margin: 24px auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
      .brand { font-weight: 700; font-size: 20px; }
      .meta { text-align: right; font-size: 14px; color: #555; }
      .section { margin-top: 16px; }
      .section h3 { margin: 0 0 8px 0; font-size: 16px; color: #333; }
      table { width: 100%; border-collapse: collapse; }
      .totals td { padding: 6px; }
      .totals .label { text-align: right; color: #555; }
      .totals .value { text-align: right; font-weight: 600; }
      .footer { margin-top: 24px; font-size: 12px; color: #777; text-align: center; }
      .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div>
          <div class="brand">Ecommerce Ashoka</div>
          <div style="color:#777;font-size:12px;">Invoice</div>
        </div>
        <div class="meta">
          <div>Invoice #: ${order.id}</div>
          <div>Date: ${dateStr}</div>
          <div>Status: <span class="badge">${order.status}</span></div>
        </div>
      </div>

      <div class="section">
        <h3>Bill To</h3>
        <div style="border:1px solid #eee;padding:12px;border-radius:6px;">
          <div><strong>${identity}:</strong> ${titleName}</div>
          <div><strong>Email:</strong> ${order.customer?.email || order.wholesaler?.email || '-'}</div>
          <div><strong>Phone:</strong> ${order.customer?.phone || order.wholesaler?.phone || '-'}</div>
        </div>
      </div>

      <div class="section">
        <h3>Shipping Address</h3>
        <div style="border:1px solid #eee;padding:12px;border-radius:6px;">
          ${order.shipping_address || '-'}
        </div>
      </div>

      <div class="section">
        <h3>Items</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Product</th>
              <th style="text-align:center;padding:8px;border-bottom:1px solid #ccc;">Qty</th>
              <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Price</th>
              <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <table class="totals">
          <tr>
            <td class="label" style="width:80%;">Subtotal</td>
            <td class="value" style="width:20%;">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label">Discount ${order.coupon_code ? '(' + order.coupon_code + ')' : ''}</td>
            <td class="value">-₹${discount.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label"><strong>Grand Total</strong></td>
            <td class="value"><strong>₹${total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="footer">
        This is a system-generated invoice. If you have questions, contact support.
      </div>
    </div>
    <script>
      window.onload = function() {
        setTimeout(function(){ window.print(); }, 300);
      };
    </script>
  </body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('Get order invoice error:', error);
    res.status(500).send('Server error');
  }
};

exports.cancelMyOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userType = req.userType;

    const order = await Order.findByPk(id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }
      ],
      transaction: t,
      lock: t.LOCK.UPDATE
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({ message: 'Order not found' });
    }

    if (userType === 'wholesaler' && order.wholesaler_id !== userId) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied' });
    }
    if (userType === 'customer' && order.customer_id !== userId) {
      await t.rollback();
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!['pending', 'processing'].includes(order.status)) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: 'Only pending or processing orders can be cancelled' });
    }

    for (const item of order.items || []) {
      if (item.product) {
        await item.product.increment('stock', { by: item.quantity, transaction: t });
      }
    }

    order.status = 'cancelled';
    await order.save({ transaction: t });

    await t.commit();

    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Cancel my order error:', error);
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

    const order = await Order.findByPk(id, {
      include: [
        { model: OrderItem, as: 'items' },
        { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['id', 'business_name', 'email', 'phone'] }
      ]
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    await order.save();

    if (status === 'delivered') {
      const recipient = order.customer?.email || order.wholesaler?.email || null;
      if (recipient) {
        const titleName = order.customer ? order.customer.name : (order.wholesaler ? order.wholesaler.business_name : 'Customer');
        const identity = order.customer ? 'Customer' : 'Wholesaler';
        const subtotal = Number(order.total_amount || 0) + Number(order.discount_amount || 0);
        const discount = Number(order.discount_amount || 0);
        const total = Number(order.total_amount || 0);
        const dateStr = new Date(order.created_at).toLocaleString();
        const rows = (order.items || []).map((it) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${it.product_name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${it.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${Number(it.price).toFixed(2)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹${(Number(it.price) * it.quantity).toFixed(2)}</td>
          </tr>
        `).join('');
        const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Invoice #${order.id}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: #222; }
      .container { max-width: 900px; margin: 24px auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
      .brand { font-weight: 700; font-size: 20px; }
      .meta { text-align: right; font-size: 14px; color: #555; }
      .section { margin-top: 16px; }
      .section h3 { margin: 0 0 8px 0; font-size: 16px; color: #333; }
      table { width: 100%; border-collapse: collapse; }
      .totals td { padding: 6px; }
      .totals .label { text-align: right; color: #555; }
      .totals .value { text-align: right; font-weight: 600; }
      .footer { margin-top: 24px; font-size: 12px; color: #777; text-align: center; }
      .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; background: #e8f5e9; color: #2e7d32; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div>
          <div class="brand">Ecommerce Ashoka</div>
          <div style="color:#777;font-size:12px;">Invoice</div>
        </div>
        <div class="meta">
          <div>Invoice #: ${order.id}</div>
          <div>Date: ${dateStr}</div>
          <div>Status: <span class="badge">${order.status}</span></div>
        </div>
      </div>

      <div class="section">
        <h3>Bill To</h3>
        <div style="border:1px solid #eee;padding:12px;border-radius:6px;">
          <div><strong>${identity}:</strong> ${titleName}</div>
          <div><strong>Email:</strong> ${order.customer?.email || order.wholesaler?.email || '-'}</div>
          <div><strong>Phone:</strong> ${order.customer?.phone || order.wholesaler?.phone || '-'}</div>
        </div>
      </div>

      <div class="section">
        <h3>Shipping Address</h3>
        <div style="border:1px solid #eee;padding:12px;border-radius:6px;">
          ${order.shipping_address || '-'}
        </div>
      </div>

      <div class="section">
        <h3>Items</h3>
        <table>
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:1px solid #ccc;">Product</th>
              <th style="text-align:center;padding:8px;border-bottom:1px solid #ccc;">Qty</th>
              <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Price</th>
              <th style="text-align:right;padding:8px;border-bottom:1px solid #ccc;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <div class="section">
        <table class="totals">
          <tr>
            <td class="label" style="width:80%;">Subtotal</td>
            <td class="value" style="width:20%;">₹${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label">Discount ${order.coupon_code ? '(' + order.coupon_code + ')' : ''}</td>
            <td class="value">-₹${discount.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label"><strong>Grand Total</strong></td>
            <td class="value"><strong>₹${total.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      <div class="footer">
        This is a system-generated invoice. If you have questions, contact support.
      </div>
    </div>
  </body>
</html>
        `;
        const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
        const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '0', 10);
        const user = process.env.SMTP_USER || process.env.MAIL_USER;
        const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;
        const from = process.env.FROM_EMAIL || process.env.ADMIN_EMAIL || 'no-reply@ecommerce-ashoka.local';
        const transport = host && port && user && pass
          ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
          : nodemailer.createTransport({ streamTransport: true, newline: 'unix', buffer: true });
        await transport.sendMail({
          from,
          to: recipient,
          subject: `Invoice #${order.id}`,
          html
        });
      }
    }

    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
