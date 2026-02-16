const Category = require('./Category');
const Product = require('./Product');
const ProductImage = require('./ProductImage');
const AdminUser = require('./AdminUser');
const User = require('./User');
const Wholesaler = require('./Wholesaler');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Coupon = require('./Coupon');
const Review = require('./Review');
const Shipment = require('./Shipment');
const CommunicationLog = require('./CommunicationLog');

// Associations
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.belongsTo(AdminUser, { foreignKey: 'created_by', as: 'creator' });
AdminUser.hasMany(Product, { foreignKey: 'created_by', as: 'products' });

// Cart Associations
User.hasOne(Cart, { foreignKey: 'customer_id', as: 'cart' });
Cart.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

Wholesaler.hasOne(Cart, { foreignKey: 'wholesaler_id', as: 'cart' });
Cart.belongsTo(Wholesaler, { foreignKey: 'wholesaler_id', as: 'wholesaler' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart' });

Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Order Associations
User.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

Wholesaler.hasMany(Order, { foreignKey: 'wholesaler_id', as: 'orders' });
Order.belongsTo(Wholesaler, { foreignKey: 'wholesaler_id', as: 'wholesaler' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

Product.hasMany(Review, { foreignKey: 'product_id', as: 'reviews' });
Review.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

User.hasMany(Review, { foreignKey: 'customer_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

Wholesaler.hasMany(Review, { foreignKey: 'wholesaler_id', as: 'reviews' });
Review.belongsTo(Wholesaler, { foreignKey: 'wholesaler_id', as: 'wholesaler' });

Order.hasMany(Shipment, { foreignKey: 'order_id', as: 'shipments' });
Shipment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Communication logs associations (soft links for convenience)
User.hasMany(CommunicationLog, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'user' }, as: 'communications' });
Wholesaler.hasMany(CommunicationLog, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'wholesaler' }, as: 'communications' });
Order.hasMany(CommunicationLog, { foreignKey: 'entity_id', constraints: false, scope: { entity_type: 'order' }, as: 'communications' });
CommunicationLog.belongsTo(User, { foreignKey: 'entity_id', constraints: false, as: 'user' });
CommunicationLog.belongsTo(Wholesaler, { foreignKey: 'entity_id', constraints: false, as: 'wholesaler' });
CommunicationLog.belongsTo(Order, { foreignKey: 'entity_id', constraints: false, as: 'order' });

module.exports = {
  Category,
  Product,
  ProductImage,
  AdminUser,
  User,
  Wholesaler,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Review,
  Shipment,
  Coupon,
  CommunicationLog
};
