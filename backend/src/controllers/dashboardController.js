const { Product, Category, Order, User, Wholesaler } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async (req, res) => {
  try {
    const productCount = await Product.count();
    const categoryCount = await Category.count();
    const userCount = await User.count();
    const wholesalerCount = await Wholesaler.count();

    const totalOrders = await Order.count();
    
    // Calculate Total Revenue (only paid or delivered orders)
    const revenueResult = await Order.sum('total_amount', {
      where: {
        [Op.or]: [
          { payment_status: 'paid' },
          { status: 'delivered' }
        ]
      }
    });
    const totalRevenue = revenueResult || 0;

    // Low Stock Products (< 10)
    const lowStockCount = await Product.count({
      where: {
        stock: { [Op.lt]: 10 }
      }
    });

    // Recent 5 Orders
    const recentOrders = await Order.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        { model: User, as: 'customer', attributes: ['name'] },
        { model: Wholesaler, as: 'wholesaler', attributes: ['business_name'] }
      ]
    });

    res.json({
      totalProducts: productCount,
      totalCategories: categoryCount,
      totalUsers: userCount,
      totalWholesalers: wholesalerCount,
      totalOrders,
      totalRevenue,
      lowStockCount,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
