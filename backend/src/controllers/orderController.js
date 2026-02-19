const { Order, OrderItem, Cart, CartItem, Product, ProductImage, User, Wholesaler, Coupon } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

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

const buildPublicOrderId = (order) => {
  if (!order || !order.id) return null;
  const numericId = Number(order.id);
  if (!Number.isFinite(numericId) || numericId <= 0) return String(order.id);
  const padded = String(numericId).padStart(6, '0');

  const hasWholesaler =
    (order.wholesaler_id && Number(order.wholesaler_id) > 0) ||
    (order.wholesaler && (order.wholesaler.id || order.wholesaler.business_name));

  if (hasWholesaler) {
    return `W${padded}`;
  }

  return `U${padded}`;
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
      (order.payment_method || 'cod').toLowerCase() === 'cod'
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
      `Thank you for your order #${order.id}.`,
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
                Order confirmation from <span style="font-weight:600;color:#111827;">Ashoka</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 20px rgba(15,23,42,0.08);border:1px solid #e5e7eb;">
                <div style="background:linear-gradient(90deg,#b91c1c,#f97316);padding:18px 24px;color:#f9fafb;">
                  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;">
                    <div style="font-size:18px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                      Ashoka
                    </div>
                    <div style="text-align:right;margin-top:6px;font-size:12px;">
                      <div style="font-weight:600;">Order Confirmed</div>
                      <div style="opacity:0.9;">Order #${order.id}</div>
                    </div>
                  </div>
                </div>

                <div style="padding:24px 24px 8px 24px;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:#111827;">
                    Dear <span style="font-weight:600;">${recipientName}</span>,
                  </p>
                  <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">
                    Thank you for shopping with <span style="font-weight:600;">Ashoka</span>. We have received your order
                    <span style="font-weight:600;">#${order.id}</span>.
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
                        <span style="display:inline-block;padding:2px 10px;border-radius:999px;background-color:#fef3c7;color:#92400e;font-size:12px;font-weight:600;text-transform:capitalize;">
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
                    <a href="${orderUrl}" style="display:inline-block;padding:10px 22px;border-radius:999px;background:linear-gradient(90deg,#b91c1c,#f97316);color:#f9fafb;text-decoration:none;font-size:13px;font-weight:600;">
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
      subject: `Order #${order.id} confirmed`,
      text,
      html,
    });
  } catch (err) {
    console.error('Order confirmation email error:', err);
  }
};

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

    sendOrderConfirmationEmail(order.id);

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

    sendOrderConfirmationEmail(order.id);

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

    const result = orders.map((o) => {
      const plain = o.toJSON();
      return {
        ...plain,
        display_order_id: buildPublicOrderId(plain),
      };
    });

    res.status(200).json(result);
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

    const plain = order.toJSON();
    res.status(200).json({
      ...plain,
      display_order_id: buildPublicOrderId(plain),
    });
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
    const publicId = buildPublicOrderId(order);

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
          <div>Invoice #: ${publicId || order.id}</div>
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

    const mappedOrders = rows.map((o) => {
      const plain = o.toJSON();
      return {
        ...plain,
        display_order_id: buildPublicOrderId(plain),
      };
    });

    res.status(200).json({
      orders: mappedOrders,
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

    // Admin can move orders through workflow, but cannot cancel them from here.
    if (!['pending', 'processing', 'shipped', 'delivered'].includes(status)) {
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
