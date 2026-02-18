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

    const frontendBase =
      process.env.FRONTEND_BASE_URL ||
      process.env.STORE_FRONT_URL ||
      'https://www.example.com';

    const orderUrl = `${frontendBase.replace(/\/+$/, '')}/orders`;

    const html = `
      <div style="margin:0;padding:24px;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#111827;line-height:1.6;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:640px;margin:0 auto;">
          <tr>
            <td>
              <div style="text-align:center;margin-bottom:16px;color:#6b7280;font-size:12px;">
                Payment confirmation from <span style="font-weight:600;color:#111827;">Ashoka</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(15,23,42,0.08);border:1px solid #e5e7eb;">
                <div style="background:linear-gradient(90deg,#15803d,#22c55e);padding:18px 24px;color:#f9fafb;">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;">
                    <div style="font-size:18px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                      Ashoka
                    </div>
                    <div style="text-align:right;margin-top:6px;font-size:12px;">
                      <div style="font-weight:600;">Payment Successful</div>
                      <div style="opacity:0.9;">Order #${order.id}</div>
                    </div>
                  </div>
                </div>

                <div style="padding:24px 24px 8px 24px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">
                    Dear <span style="font-weight:600;">${recipientName}</span>,
                  </p>
                  <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">
                    Thank you for your payment. Your order
                    <span style="font-weight:600;">#${order.id}</span> has been received and is now being processed.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:16px;border-collapse:collapse;font-size:13px;">
                    <tr>
                      <td style="padding:8px 0;color:#6b7280;width:35%;">Order date</td>
                      <td style="padding:8px 0;color:#111827;font-weight:500;">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;">Payment method</td>
                      <td style="padding:4px 0;color:#111827;font-weight:500;">${paymentMethod}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;color:#6b7280;">Status</td>
                      <td style="padding:4px 0;">
                        <span style="display:inline-block;padding:2px 10px;border-radius:999px;background-color:#ecfdf3;color:#166534;font-size:12px;font-weight:600;text-transform:capitalize;">
                          ${order.status}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="padding:8px 24px 20px 24px;">
                  <div style="margin-top:8px;margin-bottom:8px;font-size:14px;font-weight:600;color:#111827;">
                    Order Summary
                  </div>
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;font-size:13px;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                    <thead style="background-color:#f9fafb;">
                      <tr>
                        <th align="left" style="padding:8px 10px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Product</th>
                        <th align="center" style="padding:8px 10px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Qty</th>
                        <th align="right" style="padding:8px 10px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Price</th>
                        <th align="right" style="padding:8px 10px;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                    </tbody>
                  </table>

                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:16px;font-size:13px;">
                    <tr>
                      <td align="right" style="padding:2px 0;color:#6b7280;">Subtotal</td>
                      <td align="right" style="padding:2px 0;color:#111827;font-weight:500;width:120px;">₹${subtotal.toFixed(
                        2,
                      )}</td>
                    </tr>
                    <tr>
                      <td align="right" style="padding:2px 0;color:#6b7280;">Discount</td>
                      <td align="right" style="padding:2px 0;color:#16a34a;font-weight:500;">-₹${discount.toFixed(
                        2,
                      )}</td>
                    </tr>
                    <tr>
                      <td align="right" style="padding:6px 0;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">Grand Total</td>
                      <td align="right" style="padding:6px 0;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">₹${total.toFixed(
                        2,
                      )}</td>
                    </tr>
                  </table>

                  <div style="margin-top:20px;text-align:center;">
                    <a href="${orderUrl}" style="display:inline-block;padding:10px 22px;border-radius:999px;background:linear-gradient(90deg,#15803d,#22c55e);color:#f9fafb;text-decoration:none;font-size:13px;font-weight:600;">
                      View your orders
                    </a>
                  </div>

                  <p style="margin-top:18px;margin-bottom:0;font-size:12px;color:#6b7280;text-align:center;">
                    We will process your order soon. If you have any questions, reply to this email.
                  </p>
                </div>
              </div>

              <div style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af;">
                © ${new Date().getFullYear()} Ashoka. All rights reserved.
              </div>
            </td>
          </tr>
        </table>
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
