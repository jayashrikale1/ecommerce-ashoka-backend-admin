const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Order, Cart, CartItem, Product, OrderItem, Coupon, User, Wholesaler } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const createEmailTransport = () => {
  const host = process.env.SMTP_HOST || process.env.MAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || '0', 10);
  const user = process.env.SMTP_USER || process.env.MAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS;

  if (host && port && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true,
  });
};

const sendOrderConfirmationEmail = async (orderId) => {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderItem,
          as: 'items',
        },
        { model: User, as: 'customer', attributes: ['name', 'email'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['business_name', 'email'] },
      ],
    });

    if (!order) {
      return;
    }

    const recipientEmail = order.customer?.email || order.wholesaler?.email;
    if (!recipientEmail) {
      return;
    }

    const recipientName =
      order.customer?.name || order.wholesaler?.business_name || 'Customer';

    const subtotal = Number(order.total_amount || 0) + Number(order.discount_amount || 0);
    const discount = Number(order.discount_amount || 0);
    const total = Number(order.total_amount || 0);
    const dateStr = new Date(order.created_at).toLocaleString();
    const paymentMethod =
      (order.payment_method || 'online').toLowerCase() === 'cod'
        ? 'Cash on Delivery'
        : 'Online Payment';

    const itemsRows = (order.items || [])
      .map((it) => {
        const price = Number(it.price || 0);
        const lineTotal = price * it.quantity;
        return `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.product_name}</td>
            <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #eee;">${it.quantity}</td>
            <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee;">₹${price.toFixed(
              2,
            )}</td>
            <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #eee;">₹${lineTotal.toFixed(
              2,
            )}</td>
          </tr>
        `;
      })
      .join('');

    const text = [
      `Dear ${recipientName},`,
      '',
      `Thank you for your order #${order.id}. Your online payment was successful.`,
      `Date: ${dateStr}`,
      `Total: ₹${total.toFixed(2)}`,
      `Payment Method: ${paymentMethod}`,
      `Status: ${order.status}`,
      '',
      'We will notify you when your order is processed.',
      '',
      'Regards,',
      'Ashoka',
    ].join('\n');

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#222;line-height:1.5;">
        <p>Dear ${recipientName},</p>
        <p>Thank you for your order <strong>#${order.id}</strong>. Your online payment was successful.</p>
        <p>
          <strong>Date:</strong> ${dateStr}<br/>
          <strong>Payment Method:</strong> ${paymentMethod}<br/>
          <strong>Status:</strong> ${order.status}<br/>
        </p>
        <h4 style="margin-top:16px;margin-bottom:8px;">Order Summary</h4>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #ccc;">Product</th>
              <th style="text-align:center;padding:6px 8px;border-bottom:1px solid #ccc;">Qty</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #ccc;">Price</th>
              <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #ccc;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="margin-top:12px;">
          <div><strong>Subtotal:</strong> ₹${subtotal.toFixed(2)}</div>
          <div><strong>Discount:</strong> -₹${discount.toFixed(2)}</div>
          <div><strong>Grand Total:</strong> ₹${total.toFixed(2)}</div>
        </div>
        <p style="margin-top:16px;">
          We will process your order soon. If you have any questions, reply to this email.
        </p>
        <p>Regards,<br/>Ashoka</p>
      </div>
    `;

    const transport = createEmailTransport();
    const from =
      process.env.FROM_EMAIL ||
      process.env.ADMIN_EMAIL ||
      'no-reply@ecommerce-ashoka.local';

    await transport.sendMail({
      from,
      to: recipientEmail,
      subject: `Order #${order.id} payment confirmed`,
      text,
      html,
    });
  } catch (err) {
    console.error('Order confirmation email (payment) error:', err);
  }
};

const isValidRazorpayValue = (value) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  !value.includes('YOUR_RAZORPAY_KEY_');

const hasRazorpayConfig =
  isValidRazorpayValue(process.env.RAZORPAY_KEY_ID) &&
  isValidRazorpayValue(process.env.RAZORPAY_KEY_SECRET);

const razorpay = hasRazorpayConfig
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Create Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!hasRazorpayConfig || !razorpay) {
      await t.rollback();
      console.error('Razorpay configuration missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
      return res
        .status(500)
        .json({ message: 'Online payments are temporarily unavailable. Please try COD or contact support.' });
    }
    const userId = req.user.id;
    const userType = req.userType;
    const { shipping_address, notes, coupon_code } = req.body;

    if (!shipping_address) {
      await t.rollback();
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    // 1. Get Cart
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

    // 2. Calculate Total & Validate Stock
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        await t.rollback();
        return res.status(400).json({ 
          message: `Insufficient stock for product: ${item.product.name}. Available: ${item.product.stock}` 
        });
      }
      const itemTotal = parseFloat(item.price) * item.quantity;
      totalAmount += itemTotal;
      
      orderItemsData.push({
        product_id: item.product_id,
        product_name: item.product.name,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Apply coupon if provided
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
          // ignore coupon if limit reached
        } else if (coupon.min_order_value && totalAmount < parseFloat(coupon.min_order_value)) {
          // ignore coupon if below minimum
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

    const payableAmount = (totalAmount - discountAmount);

    // 3. Create Razorpay Order
    const options = {
      amount: Math.round(payableAmount * 100), // Amount in paise after discount
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    if (!razorpayOrder) {
      await t.rollback();
      return res.status(500).json({ message: 'Razorpay order creation failed' });
    }

    // 4. Create Local Order (Pending Payment)
    const orderData = {
      total_amount: payableAmount,
      shipping_address,
      payment_method: 'online',
      status: 'pending',
      payment_status: 'pending',
      razorpay_order_id: razorpayOrder.id,
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

    // 5. Create Order Items & Deduct Stock
    // Note: Usually we deduct stock AFTER payment success, but to reserve items we do it here. 
    // If payment fails, we might need a cleanup job or rollback logic. 
    // For simplicity, we'll deduct now and if payment verify fails/never happens, admin can cancel or auto-cancel.
    for (const itemData of orderItemsData) {
      await OrderItem.create({
        ...itemData,
        order_id: order.id
      }, { transaction: t });
      
      // Deduct stock
      const product = await Product.findByPk(itemData.product_id, { transaction: t });
      await product.decrement('stock', { by: itemData.quantity, transaction: t });
    }

    // 6. Clear Cart
    await CartItem.destroy({
      where: { cart_id: cart.id },
      transaction: t
    });

    // Increment coupon usage if applied
    if (appliedCoupon) {
      await appliedCoupon.increment('used_count', { by: 1, transaction: t });
    }

    await t.commit();

    res.status(200).json({
      message: 'Order created, proceed to payment',
      order_id: order.id,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    await t.rollback();
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Refund Payment (Admin)
exports.refundPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.payment_status !== 'paid') {
      return res.status(400).json({ message: 'Only paid orders can be refunded' });
    }
    if (!order.razorpay_payment_id) {
      return res.status(400).json({ message: 'No payment_id found for this order' });
    }

    const amountPaise = Math.round(parseFloat(order.total_amount) * 100);

    const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
      amount: amountPaise
    });

    if (!refund || !refund.id) {
      return res.status(500).json({ message: 'Refund failed' });
    }

    order.payment_status = 'refunded';
    order.razorpay_refund_id = refund.id;
    await order.save();

    res.status(200).json({
      message: 'Refund processed',
      order_id: order.id,
      refund_id: refund.id,
      amount: refund.amount
    });
  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Verify Razorpay Payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      const order = await Order.findByPk(order_id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.payment_status = 'paid';
      order.razorpay_payment_id = razorpay_payment_id;
      order.razorpay_signature = razorpay_signature;
      // order.status could stay 'pending' (processing) or move to 'processing'
      
      await order.save();

      sendOrderConfirmationEmail(order.id);

      res.status(200).json({ message: 'Payment verified successfully', order_id: order.id });
    } else {
      // Payment failed
      const order = await Order.findByPk(order_id);
      if (order) {
        order.payment_status = 'failed';
        await order.save();
        
        // Ideally: Restore stock if we want to fail strictly
        // For now, just mark as failed payment
      }
      res.status(400).json({ message: 'Invalid signature, payment verification failed' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
